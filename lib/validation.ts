// These are from https://prometheus.io/docs/concepts/data_model/#metric-names-and-labels
const metricRegexp = /^[a-zA-Z_:][a-zA-Z0-9_:]*$/;
const labelRegexp = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export const validateMetricName = (name: string) => metricRegexp.test(name);

export const validateLabelName = (names: string[] | readonly string[]) => {
  let valid = true;

  (names || []).forEach((name) => {
    if (!labelRegexp.test(name)) {
      valid = false;
    }
  });

  return valid;
};

export const validateLabel = (savedLabels: string[], labels: string[]) =>
  Object.keys(labels).forEach((label) => {
    if (savedLabels.indexOf(label) === -1) {
      throw new Error(
        `Added label "${label}" is not included in initial labelset: ${
          Deno.inspect(
            savedLabels,
          )
        }`,
      );
    }
  });
