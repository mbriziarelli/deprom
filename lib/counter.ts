/**
 * Counter metric
 */
import {
  getLabels,
  hashObject,
  isNumber,
  isObject,
  removeLabels,
} from "./util.ts";
import { validateLabel } from "./validation.ts";
import {
  CollectFunction,
  LabelValues,
  Metric,
  MetricConfiguration,
} from "./metric.ts";

const type = "counter";

export interface CounterConfiguration extends MetricConfiguration {
  collect?: CollectFunction;
}

export interface InternalInc {
  /**
   * Increment with value
   * @param value The value to increment with
   */
  inc(value?: number): void;
}

type HashMap = Record<string, { value: number; labels: LabelValues }>;

/**
 * A counter is a cumulative metric that represents a single numerical value that only ever goes up
 */
export class Counter extends Metric {
  hashMap: HashMap = {};

  /**
	 * @param configuration Configuration when creating a Counter metric. Name and Help is required.
	 */
  constructor(configuration: CounterConfiguration) {
    super(configuration);
  }

  /**
   * Increment with value
   * @param value The value to increment with
   */
  inc(value?: number): void;

  /**
	 * Increment for given labels
	 * @param labels Object with label keys and values
	 * @param value The number to increment with
	 */
  inc(labels: LabelValues, value?: number): void;

  inc(labelsOrValue?: LabelValues | number, value?: number): void {
    if (!isObject(labelsOrValue)) {
      return inc.call(this)(labelsOrValue);
    }

    const hash = hashObject(labelsOrValue);
    return inc.call(this, labelsOrValue, hash)(value);
  }

  /**
	 * Reset counter values
	 */
  reset(): void {
    return reset.call(this);
  }

  async get() {
    if (this.collect) {
      const v = this.collect();
      if (v instanceof Promise) await v;
    }
    return {
      help: this.help,
      name: this.name,
      type,
      values: Object.values(this.hashMap),
      aggregator: this.aggregator,
    };
  }

  /**
	 * Return the child for given labels
	 * @param values Label values
	 * @return Configured counter with given labels
	 */
  labels(...values: string[]): InternalInc;

  /**
    * Return the child for given labels
    * @param labels Object with label keys and values
    * @return Configured counter with given labels
    */
  labels(labels: LabelValues): InternalInc;

  labels() {
    const labels = getLabels(this.labelNames, arguments) || {};
    validateLabel(this.labelNames, labels);
    const hash = hashObject(labels);

    return {
      inc: inc.call(this, labels, hash),
    };
  }

  /**
	 * Remove metrics for the given label values
	 * @param values Label values
	 */
  remove(...values: string[]): void;

  /**
    * Remove metrics for the given label values
    * @param labels Object with label keys and values
    */
  remove(labels: LabelValues): void;

  remove() {
    const labels = getLabels(this.labelNames, arguments) || {};
    validateLabel(this.labelNames, labels);

    return removeLabels.call(this, this.hashMap, labels);
  }
}

const reset = function (this: Counter) {
  this.hashMap = {};

  if (this.labelNames.length === 0) {
    this.hashMap = setValue({}, 0);
  }
};

const inc = function (
  this: Counter,
  labels?: LabelValues,
  hash?: string,
) {
  return (value?: number) => {
    if (isNumber(value)) {
      if (!Number.isFinite(value)) {
        throw new TypeError(`Value is not a valid number: ${value}`);
      }
      if (value < 0) {
        throw new Error("It is not possible to decrease a counter");
      }
    }

    validateLabel(this.labelNames, labels);

    this.hashMap = setValue(this.hashMap, value ?? 1, labels, hash);
  };
};

function setValue(
  hashMap: HashMap,
  value: number,
  labels: LabelValues = {},
  hash = "",
) {
  if (hashMap[hash]) {
    hashMap[hash].value += value;
  } else {
    hashMap[hash] = { value, labels: labels || {} };
  }

  return hashMap;
}
