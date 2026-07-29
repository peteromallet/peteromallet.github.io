import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PublishedWeightMeasurement } from '../lib/weights';

interface Point {
  x: Date;
  y: number;
}

const HEIGHT_M = 1.9;

function useMeasurements() {
  const [data, setData] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchMeasurements() {
      const response = await fetch('/api/weights', { signal: controller.signal });
      if (!response.ok) throw new Error(`Weight request failed (${response.status})`);
      return response.json() as Promise<PublishedWeightMeasurement[]>;
    }

    fetchMeasurements()
      .then((rows) => {
        setData(
          rows
            .map((row) => ({
              x: new Date(row.withings_timestamp),
              y: Number(row.weight_kg),
            }))
            .filter((row) => Number.isFinite(row.y) && !Number.isNaN(row.x.getTime()))
            .sort((a, b) => a.x.getTime() - b.x.getTime()),
        );
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load weight data');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return { data, error, loading };
}

export function WeightsChart() {
  const { data, error, loading } = useMeasurements();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<any>(null);
  const [chartReady, setChartReady] = useState(false);

  const latestPoint = data[data.length - 1];
  const bmi = latestPoint ? latestPoint.y / (HEIGHT_M * HEIGHT_M) : null;

  const title = useMemo(() => {
    if (data.length < 2) return 'My weight tracking';
    const years = data[data.length - 1].x.getFullYear() - data[0].x.getFullYear();
    return years <= 1 ? 'My weight for the past year' : `My weight for the past ${years} years`;
  }, [data]);

  const initialRange = useMemo(() => {
    if (data.length === 0) return null;
    return {
      min: data[0].x.getTime(),
      max: data[data.length - 1].x.getTime(),
    };
  }, [data]);

  // Dynamically import Chart.js only on client side
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    let destroyed = false;

    async function initChart() {
      const [
        { Chart, LineController, LineElement, PointElement, LinearScale, TimeScale, Tooltip, Filler },
        _adapter,
        { default: zoomPlugin },
      ] = await Promise.all([
        import('chart.js'),
        import('chartjs-adapter-date-fns'),
        import('chartjs-plugin-zoom'),
      ]);

      if (destroyed) return;

      Chart.register(LineController, LineElement, PointElement, LinearScale, TimeScale, Tooltip, Filler, zoomPlugin);

      if (chartRef.current) {
        chartRef.current.destroy();
      }

      chartRef.current = new Chart(canvas!, {
        type: 'line',
        data: {
          datasets: [
            {
              data,
              borderColor: '#6b7280',
              borderWidth: 2,
              pointRadius: 0,
              pointHitRadius: 10,
              fill: false,
              tension: 0.1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 300 },
          scales: {
            x: {
              type: 'time',
              time: {
                tooltipFormat: 'MMM d, yyyy',
                displayFormats: { day: 'MMM d', week: 'MMM d', month: 'MMM yyyy' },
              },
              min: initialRange?.min,
              max: initialRange?.max,
              grid: { display: false },
              ticks: { font: { family: "'Space Mono', monospace", size: 10 }, color: '#9ca3af' },
            },
            y: {
              type: 'linear' as const,
              beginAtZero: false,
              grid: { color: 'rgba(200,200,220,0.2)' },
              ticks: {
                font: { family: "'Space Mono', monospace", size: 10 },
                color: '#9ca3af',
                callback(value: string | number) {
                  return `${Number(value)}kg`;
                },
                maxTicksLimit: 6,
              },
            },
          },
          plugins: {
            tooltip: {
              callbacks: {
                label(context: any) {
                  const kg = context.parsed.y.toFixed(1);
                  const lbs = (context.parsed.y * 2.205).toFixed(1);
                  return `${kg} kg / ${lbs} lbs`;
                },
              },
            },
            zoom: {
              limits: {
                x: {
                  min: data[0].x.getTime(),
                  max: data[data.length - 1].x.getTime(),
                },
              },
              pan: { enabled: true, mode: 'x' as const },
              zoom: {
                wheel: { enabled: true },
                pinch: { enabled: true },
                mode: 'x' as const,
              },
            },
          },
        },
      });

      setChartReady(true);
    }

    initChart();

    return () => {
      destroyed = true;
      chartRef.current?.destroy();
      chartRef.current = null;
      setChartReady(false);
    };
  }, [data, initialRange]);

  const zoomTo = useCallback(
    (preset: 'week' | 'quarter' | 'all') => {
      const chart = chartRef.current;
      if (!chart || data.length === 0) return;

      const latest = data[data.length - 1].x;
      const earliest = data[0].x;
      let min: number;

      if (preset === 'all') {
        min = earliest.getTime();
      } else if (preset === 'quarter') {
        const d = new Date(latest);
        d.setMonth(d.getMonth() - 3);
        min = Math.max(d.getTime(), earliest.getTime());
      } else {
        const d = new Date(latest);
        d.setDate(d.getDate() - 7);
        min = Math.max(d.getTime(), earliest.getTime());
      }

      chart.options.scales!.x!.min = min;
      chart.options.scales!.x!.max = latest.getTime();
      chart.update('none');
    },
    [data],
  );

  return (
    <>
      <div className="weights-chart-frame" id="weights-chart-container">
        <div className="weights-chart-shell">
          {loading ? (
            <div className="weights-chart-loading">
              <div className="weights-chart-spinner"></div>
              <div>Loading weight data...</div>
            </div>
          ) : error ? (
            <div className="weights-chart-loading">
              <div>Failed to load weight data</div>
            </div>
          ) : (
            <canvas ref={canvasRef} />
          )}
        </div>
      </div>
      {chartReady && (
        <div className="weights-chart-zoom-controls">
          <button type="button" className="weights-chart-zoom-button" onClick={() => zoomTo('week')}>
            7d
          </button>
          <button type="button" className="weights-chart-zoom-button" onClick={() => zoomTo('quarter')}>
            3m
          </button>
          <button type="button" className="weights-chart-zoom-button" onClick={() => zoomTo('all')}>
            All
          </button>
        </div>
      )}
      <h3 id="weights-title" className="weights-chart-title">
        {title}
      </h3>
      <div className="weights-chart-text-block">
        <p>
          For reference, I am 190cm - meaning my BMI currently is{' '}
          {bmi ? bmi.toFixed(1) : '{calculate based on last measurement}'}. I&apos;m publishing my daily weight
          measurements as part of my desire to maintain a more stable weight. This approach is inspired by my friend Matteo who published{' '}
          <a href="https://opensource.com/life/13/10/open-source-developer-story" target="_blank" rel="noreferrer">
            this great blog
          </a>{' '}
          about how one of the greatest benefits of doing things in the open is that it gives you a greater sense of accountability to the public.
        </p>
      </div>
    </>
  );
}
