export function getValueAsString(value: number) {
  if (Number.isNaN(value)) {
    return "Nan";
  } else if (!Number.isFinite(value)) {
    if (value < 0) {
      return "-Inf";
    } else {
      return "+Inf";
    }
  } else {
    return `${value}`;
  }
}

export function removeLabels(
  hashMap: Record<string, unknown>,
  labels: Record<string, unknown>,
) {
  const hash = hashObject(labels);

  delete hashMap[hash];
}

export function setValue(
  hashMap: Record<string, unknown>,
  value: unknown,
  labels: Record<string, unknown>,
) {
  const hash = hashObject(labels);

  hashMap[hash] = {
    value: typeof value === "number" ? value : 0,
    labels: labels || {},
  };

  return hashMap;
}

export function getLabels(labelNames: string[], args: unknown[]) {
  if (typeof args[0] === "object") {
    return args[0];
  }

  if (labelNames.length !== args.length) {
    throw new Error("Invalid number of arguments");
  }

  const argsAsArray = Array.prototype.slice.call(args);

  return labelNames.reduce<Record<string, unknown>>((acc, label, index) => {
    acc[label] = argsAsArray[index];
    return acc;
  }, {});
}

export function hashObject(labels: Record<string, unknown>) {
  // We don't actually need a hash here. We just need a string that
  // is unique for each possible labels object and consistent across
  // calls with equivalent labels objects.
  const keys = Object.keys(labels).sort();
  const size = keys.length;

  let hash = "";
  let i = 0;

  if (size > 0) {
    for (; i < size - 1; i++) {
      hash += `${keys[i]}:${labels[keys[i]]},`;
    }
    hash += `${keys[i]}:${labels[keys[i]]}`;
  }

  return hash;
}

export function isObject(obj: unknown): obj is Record<string, unknown> {
  return obj === Object(obj);
}

export class Grouper<K, V> extends Map<K, V[]> {
  /**
	 * Adds the `value` to the `key`'s array of values.
	 * @param key Key to set.
	 * @param value Value to add to `key`'s array.
	 * @returns undefined.
	 */
  add(key: K, value: V) {
    if (this.has(key)) {
      (this.get(key) as V[]).push(value);
    } else {
      this.set(key, [value]);
    }
  }
}
