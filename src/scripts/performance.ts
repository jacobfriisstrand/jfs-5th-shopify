class ThemePerformance {
  metricPrefix: string;

  constructor(metricPrefix: string) {
    this.metricPrefix = metricPrefix;
  }

  createStartingMarker(benchmarkName: string): PerformanceMark {
    const metricName = `${this.metricPrefix}:${benchmarkName}`;
    return performance.mark(`${metricName}:start`);
  }

  measureFromEvent(benchmarkName: string, event: Event): void {
    const metricName = `${this.metricPrefix}:${benchmarkName}`;
    performance.mark(`${metricName}:start`, {
      startTime: event.timeStamp,
    });

    performance.mark(`${metricName}:end`);

    performance.measure(metricName, `${metricName}:start`, `${metricName}:end`);
  }

  measureFromMarker(startMarker: PerformanceMark): void {
    const metricName = startMarker.name.replace(/:start$/, "");
    const endMarker = performance.mark(`${metricName}:end`);

    performance.measure(metricName, startMarker.name, endMarker.name);
  }

  measure(benchmarkName: string, callback: () => void): void {
    const metricName = `${this.metricPrefix}:${benchmarkName}`;
    performance.mark(`${metricName}:start`);

    callback();

    performance.mark(`${metricName}:end`);

    performance.measure(
      benchmarkName,
      `${metricName}:start`,
      `${metricName}:end`,
    );
  }
}

export const cartPerformance = new ThemePerformance("cart-performance");
