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

export type CollectFunction<T> = (this: T) => void | Promise<void>;

export interface metric {
  name: string;
  help: string;
  type: MetricType;
  aggregator: Aggregator;
  collect: CollectFunction<any>;
}

interface MetricConfiguration<T extends string> {
  name: string;
  help: string;
  labelNames?: T[] | readonly T[];
  registers?: Registry[];
  aggregator?: Aggregator;
  collect?: CollectFunction<any>;
}

/**
 * @abstract
 */
export class Metric<T extends string> {
  name = "";
  help = "";
  labelNames: T[] | readonly T[] = [];
  registers: Registry[] = [globalRegistry];
  aggregator: Aggregator = "sum";
  collect?: CollectFunction<any>;

  constructor(
    config: MetricConfiguration<T>,
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
