/**
 * This module provides a simplified wrapper for creating and publishing
 * CloudWatch metrics. We should always initialize our environment first:
 *
 * ```
 * var cloudwatchMetrics = require('cloudwatch-metrics');
 * cloudwatchMetrics.initialize({
 * 	region: 'us-east-1'
 * });
 * ```
 *
 * For creating a metric, we simply need to provide the
 * namespace and the type of metric:
 *
 * ```
 * 	var myMetric = new cloudwatchMetrics.CloudWatchMetric('namespace', 'Count');
 * ```
 *
 * If we want to add our own default dimensions, such as environment information,
 * we can add it in the following manner:
 *
 * ```
 * var myMetric = new cloudwatchMetrics.CloudWatchMetric('namespace', 'Count', [{
 * 	Name: 'environment',
 * 	Value: 'PROD'
 * }]);
 * ```
 *
 * If we want to disable a metric in certain environments (such as local development),
 * we can make the metric in the following manner:
 *
 * ```
 * // isLocal is a boolean
 * var isLocal = someWayOfDetermingIfLocal();
 *
 * var myMetric = new cloudwatchMetrics.CloudWatchMetric('namespace', 'Count', [{
 * 	Name: 'environment',
 * 	Value: 'PROD'
 * }], {
 * 	enabled: isLocal
 * });
 * ```
 *
 * Then, whenever we want to publish a metric, we simply do:
 *
 * ```
 * myMetric.put(value, metric, additionalDimensions, done);
 * ```
 */

var AWS = require('aws-sdk');
var _ = require('underscore');

/**
 * intialize sets the AWS SDK configuration to be the given configuration.
 * @param  {Object} config The AWS SDK configuration options one would like to set.
 */
function initialize(config) {
  AWS.config.update(config);
}

const DEFAULT_METRIC_OPTIONS = {
  enabled: true
};

/**
 * Create a custom CloudWatch Metric object that sets pre-configured dimensions and allows for
 * customized metricName and units. Each CloudWatchMetric object has it's own internal
 * AWS.CloudWatch object to prevent errors due to overlapping callings to
 * AWS.CloudWatch#putMetricData.
 *
 * @param {String} namespace         CloudWatch namespace
 * @param {String} units             CloudWatch units
 * @param {Object} defaultDimensions (optional) Any default dimensions we'd
 *    like the metric to have.
 * @param {Object} options           (optional) Options used to control metric
 *    behavior.
 *   @param {Bool} options.enabled   Defaults to true, controls whether we
 *      publish the metric when `Metric#put()` is called - this is useful for
 *      turning off metrics in specific environments.
 */
function CloudWatchMetric(namespace, units, defaultDimensions, options) {
  // Use a separate AWS.CloudWatch object for each CloudWatchMetric. This will prevent internal
  // race conditions with the AWS.CloudWatch implementation.
  this.cloudwatch = new AWS.CloudWatch();
  this.namespace = namespace;
  this.units = units;
  this.defaultDimensions = defaultDimensions || [];
  this.options = _.defaults(options || {}, DEFAULT_METRIC_OPTIONS);
}

/**
 * Publish this data to Cloudwatch
 * @param {Integer|Long} value          Data point to submit
 * @param {String} namespace            Name of the metric
 * @param {Array} additionalDimensions  Array of additional CloudWatch metric dimensions. See
 * http://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_Dimension.html for details.
 * @param {function} done               Node style callback
 */
CloudWatchMetric.prototype.put = (value, metricName, additionalDimensions, done) => {
  var self = this;
  additionalDimensions = additionalDimensions || [];
  var params = {
    MetricData: [{
      MetricName: metricName,
      Dimensions: self.defaultDimensions.concat(additionalDimensions),
      Unit: self.units,
      Value: value
    }],
    Namespace: self.namespace
  };

  // Only publish if we are enabled
  if (self.options.enabled) {
    self.cloudwatch.putMetricData(params, done);
  } else {
    done();
  }
};

module.exports = {
  initialize,
  CloudWatchMetric
};