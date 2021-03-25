import { globalRegistry, Registry } from "./registry.ts";
import { isObject } from "./util.ts";
import { validateLabelName, validateMetricName } from "./validation.ts";

/**
* Aggregation methods, used for aggregating metrics in a Node.js cluster.
*/
export type Aggregator = "omit" | "sum" | "first" | "min" | "max" | "average";

export enum MetricType {
  Counter,
  Gauge,
  Histogram,
  Summary,
}

export type LabelValues = Record<string, string | number>;

export type CollectFunction = <T>(this: T) => void | Promise<void>;

export interface metric {
  name: string;
  help: string;
  type: MetricType;
  aggregator: Aggregator;
  collect: CollectFunction;
}

export interface MetricConfiguration {
  name: string;
  help: string;
  labelNames?: string[];
  registers?: Registry[];
  aggregator?: Aggregator;
  collect?: CollectFunction;
}

/**
 * @abstract
 */
export class Metric {
  name = "";
  help = "";
  labelNames: string[] = [];
  registers: Registry[] = [globalRegistry];
  aggregator: Aggregator = "sum";
  collect?: CollectFunction;

  constructor(
    config: MetricConfiguration,
    defaults: Record<string, unknown> = {},
  ) {
    if (!isObject(config)) {
      throw new TypeError("constructor expected a config object");
    }

    Object.assign(
      this,
      defaults,
      config,
    );

    if (!this.registers) {
      // in case config.registers is `undefined`
      this.registers = [globalRegistry];
    }
    if (!this.help) {
      throw new Error("Missing mandatory help parameter");
    }
    if (!this.name) {
      throw new Error("Missing mandatory name parameter");
    }
    if (!validateMetricName(this.name)) {
      throw new Error("Invalid metric name");
    }
    if (!validateLabelName(this.labelNames)) {
      throw new Error("Invalid label name");
    }
    if (this.collect && typeof this.collect !== "function") {
      throw new Error('Optional "collect" parameter must be a function');
    }

    this.reset();

    for (const register of this.registers) {
      register.registerMetric(this);
    }
  }

  reset() {
    /* abstract */
  }
}
