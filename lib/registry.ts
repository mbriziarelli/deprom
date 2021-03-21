import { Counter } from "./counter.ts";
import { Gauge } from "./gauge.ts";
import { Summary } from "./summary.ts";
import { Histogram } from "./histogram.ts";
import { getValueAsString } from "./util.ts";
import { metric } from "./metric.ts";

/**
 * General metric type
 */
type Metric<T extends string> =
  | Counter<T>
  | Gauge<T>
  | Summary<T>
  | Histogram<T>;

function escapeString(str: string) {
  return str.replace(/\n/g, "\\n").replace(/\\(?!n)/g, "\\\\");
}

function escapeLabelValue(str: unknown) {
  if (typeof str !== "string") {
    return str;
  }

  return escapeString(str).replace(/"/g, '\\"');
}

/**
 * Container for all registered metrics
 */
export class Registry {
  private _metrics: Record<string, Metric<string>> = {};
  private _defaultLabels: Record<string, string> = {};

  getMetricsAsArray<T extends string>(): Metric<T>[] {
    return Object.values(this._metrics);
  }

  async getMetricAsPrometheusString<T extends string>(metric: Metric<T>) {
    const item = await metric.get();
    const name = escapeString(item.name);
    const help = `# HELP ${name} ${escapeString(item.help)}`;
    const type = `# TYPE ${name} ${item.type}`;
    const defaultLabelNames = Object.keys(this._defaultLabels);

    let values = "";
    for (const val of item.values || []) {
      val.labels = val.labels || {};

      if (defaultLabelNames.length > 0) {
        // Make a copy before mutating
        val.labels = Object.assign({}, val.labels);

        for (const labelName of defaultLabelNames) {
          val.labels[labelName] = val.labels[labelName] ||
            this._defaultLabels[labelName];
        }
      }

      let metricName = val.metricName || item.name;

      const keys = Object.keys(val.labels);
      const size = keys.length;
      if (size > 0) {
        let labels = "";
        let i = 0;
        for (; i < size - 1; i++) {
          labels += `${keys[i]}="${escapeLabelValue(val.labels[keys[i]])}",`;
        }
        labels += `${keys[i]}="${escapeLabelValue(val.labels[keys[i]])}"`;
        metricName += `{${labels}}`;
      }

      values += `${metricName} ${getValueAsString(val.value)}\n`;
    }

    return `${help}\n${type}\n${values}`.trim();
  }

  /**
	 * Get string representation for all metrics
	 */
  async metrics(): Promise<string> {
    const promises = [];

    for (const metric of this.getMetricsAsArray()) {
      promises.push(this.getMetricAsPrometheusString(metric));
    }

    const resolves = await Promise.all(promises);

    return `${resolves.join("\n\n")}\n`;
  }

  /**
	 * Register metric to register
	 * @param metric Metric to add to register
	 */
  registerMetric<T extends string>(metric: Metric<T>): void {
    if (this._metrics[metric.name] && this._metrics[metric.name] !== metric) {
      throw new Error(
        `A metric with the name ${metric.name} has already been registered.`,
      );
    }

    this._metrics[metric.name] = metric;
  }

  /**
	 * Remove all metrics from the registry
	 */
  clear(): void {
    this._metrics = {};
    this._defaultLabels = {};
  }

  /**
	 * Get all metrics as objects
	 */
  async getMetricsAsJSON(): Promise<metric[]> {
    const metrics = [];
    const defaultLabelNames = Object.keys(this._defaultLabels);

    const promises = [];

    for (const metric of this.getMetricsAsArray()) {
      promises.push(metric.get());
    }

    const resolves = await Promise.all(promises);

    for (const item of resolves) {
      if (item.values && defaultLabelNames.length > 0) {
        for (const val of item.values) {
          // Make a copy before mutating
          val.labels = Object.assign({}, val.labels);

          for (const labelName of defaultLabelNames) {
            val.labels[labelName] = val.labels[labelName] ||
              this._defaultLabels[labelName];
          }
        }
      }

      metrics.push(item);
    }

    return metrics;
  }

  /**
	 * Remove a single metric
	 * @param name The name of the metric to remove
	 */
  removeSingleMetric(name: string): void {
    delete this._metrics[name];
  }

  /**
	 * Get a string representation of a single metric by name
	 * @param name The name of the metric
	 */
  getSingleMetricAsString(name: string): Promise<string> {
    return this.getMetricAsPrometheusString(this._metrics[name]);
  }

  /**
	 * Get a single metric
	 * @param name The name of the metric
	 */
  getSingleMetric<T extends string>(name: string): Metric<T> | undefined {
    return this._metrics[name];
  }

  /**
	 * Set static labels to every metric emitted by this registry
	 * @param labels of name/value pairs:
	 * { defaultLabel: "value", anotherLabel: "value 2" }
	 */
  setDefaultLabels(labels: Record<string, string>): void {
    this._defaultLabels = labels;
  }

  /**
	 * Reset all metrics in the registry
	 */
  resetMetrics(): void {
    for (const metric in this._metrics) {
      this._metrics[metric].reset();
    }
  }

  /**
	 * Gets the Content-Type of the metrics for use in the response headers.
	 */
  get contentType(): string {
    return "text/plain; version=0.0.4; charset=utf-8";
  }

  /**
	 * Merge registers
	 * @param registers The registers you want to merge together
	 */
  static merge<T extends string>(registers: Registry[]): Registry {
    const mergedRegistry = new Registry();

    const metricsToMerge = registers.reduce<Metric<T>[]>(
      (acc, reg) => acc.concat(reg.getMetricsAsArray()),
      [],
    );

    metricsToMerge.forEach(mergedRegistry.registerMetric, mergedRegistry);

    return mergedRegistry;
  }
}

export const globalRegistry = new Registry();
