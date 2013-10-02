'use strict';

// testUtils should be require'd before anything else in each spec file!

// Ensure we are using the 'as promised' libs before any tests are run:
require('mocha-as-promised')();
require('chai').use(require('chai-as-promised'));

var utils = module.exports = {

  getUserStripeKey: function() {
    var key = process.env.STRIPE_TEST_API_KEY;

    if (!key) {
      throw new Error('Expected environment variable STRIPE_TEST_API_KEY to be set.');
    }

    if (!/^sk_test_/.test(key)) {
      throw new Error('Expected STRIPE_TEST_API_KEY to be of the form "sk_test_[...]".');
    }

    return key;
  },

  getSpyableStripe: function() {
    // Provide a testable stripe instance
    // That is, with mock-requests built in and hookable

    var Stripe = require('../lib/stripe');
    var stripeInstance = Stripe('fakeAuthToken');

    for (var i in stripeInstance) {
      if (stripeInstance[i] instanceof Stripe.StripeResource) {

        // Override each _request method so we can make the params
        // avaialable to consuming tests:
        stripeInstance[i]._request = function(method, url, data, cb) {
          stripeInstance.LAST_REQUEST = {
            method: method,
            url: url,
            data: data
          };
        };

      }
    }

    return stripeInstance;

  },

  /**
   * A utility where cleanup functions can be registered to be called post-spec.
   * CleanupUtility will automatically register on the mocha afterEach hook,
   * ensuring its called after each descendent-describe block.
   */
  CleanupUtility: (function() {

    function CleanupUtility() {
      var self = this;
      this._cleanupFns = [];
      this._stripe = require('../lib/stripe')(
        utils.getUserStripeKey()
      );
      afterEach(function(done) {
        return self.doCleanup(done);
      });
    }

    CleanupUtility.prototype = {

      doCleanup: function(done) {
        var cleanups = this._cleanupFns;
        var total = cleanups.length;
        var completed = 0;
        for (var fn; fn = cleanups.shift();) {
          fn.call(this).then(function() {
            // cleanup successful
            ++completed;
            if (completed === total) {
              done();
            }
          }, function(err) {
            // not successful
            throw err;
          });
        }
      },
      add: function(fn) {
        this._cleanupFns.push(fn);
      },
      deleteCustomer: function(custId) {
        this.add(function() {
          return this._stripe.customers.del(custId);
        });
      },
      deletePlan: function(custId) {
        this.add(function() {
          return this._stripe.plans.del(custId);
        });
      }
    };

    return CleanupUtility;

  }())

};



