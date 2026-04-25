import { DAYS, HOURS, HEATMAP } from "@/lib/mockData";

interface HeatmapProps {
  compact?: boolean;
  blurred?: boolean;
  onCellClick?: (day: number, hour: number) => void;
  data?: number[][];  // 7×12 matrix; falls back to mock data when omitted (Landing demo)
}

const intensityClass = (n: number) => {
  const map = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4", "bg-heat-5"];
  return map[Math.max(0, Math.min(5, n))];
};

export const Heatmap = ({ compact = false, blurred = false, onCellClick, data }: HeatmapProps) => {
  const matrix = data ?? HEATMAP;

  return (
    <div className={`relative ${blurred ? "filter blur-[3px] select-none" : ""}`}>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="grid" style={{ gridTemplateColumns: `auto repeat(${HOURS.length}, minmax(${compact ? "20px" : "28px"}, 1fr))` }}>
            <div />
            {HOURS.map((h) => (
              <div key={h} className="text-[10px] text-muted-foreground text-center pb-1">{h}</div>
            ))}
            {DAYS.map((d, di) => (
              <div key={d} className="contents">
                <div className="text-xs text-muted-foreground pr-2 flex items-center font-medium">{d}</div>
                {matrix[di].map((v, hi) => (
                  <button
                    key={`${di}-${hi}`}
                    onClick={() => onCellClick?.(di, hi)}
                    className={`heat-cell ${intensityClass(v)} ${compact ? "h-5" : "h-7"} m-[2px] hover:ring-2 hover:ring-primary hover:ring-offset-1`}
                    aria-label={`${d} ${HOURS[hi]} intensity ${v}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
        <span>Quieter</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <div key={n} className={`h-3 w-3 rounded-sm ${intensityClass(n)}`} />
          ))}
        </div>
        <span>Busier</span>
      </div>
    </div>
  );
};
