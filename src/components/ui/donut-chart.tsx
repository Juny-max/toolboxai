
"use client"

import * as React from "react"
import { Label, Pie, PieChart, Sector, Cell } from "recharts"
import { PieSectorDataItem } from "recharts/types/polar/Pie"

import {
  ChartConfig,
  ChartContainer,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const DonutChart = React.forwardRef<
  HTMLDivElement,
  {
    data: any[]
    category: string
    index: string
    variant?: "donut" | "pie"
    valueFormatter?: (value: number) => string
    label?: boolean
    labelPosition?: "inside" | "outside"
    labelStyle?: React.CSSProperties
    activeMetric?: string
    onMetricChange?: (value: string) => void
    chartConfig?: ChartConfig
    customTooltipContent?: React.ComponentType<any>
  }
>(
  (
    {
      data,
      category,
      index,
      variant = "donut",
      valueFormatter = (value) => value.toString(),
      label,
      labelPosition = "outside",
      labelStyle,
      chartConfig: customChartConfig,
      activeMetric,
      onMetricChange,
      customTooltipContent,
      ...props
    },
    ref
  ) => {
    const [activeChart, setActiveChart] = React.useState(activeMetric)
    const activeCategory = activeMetric || activeChart

    const chartConfig = React.useMemo(() => {
      if (customChartConfig) return customChartConfig;

      const newConfig: ChartConfig = {}
      data.forEach((item, i) => {
        newConfig[item[index]] = {
          label: item[index],
          color: `hsl(var(--chart-${(i % 5) + 1}))`,
        }
      })

      return {
        visitors: {
          label: "Visitors",
        },
        ...newConfig,
      }
    }, [data, index, customChartConfig])

    const total = React.useMemo(() => {
      return data.reduce((acc, curr) => acc + curr[category], 0)
    }, [data, category])

    const handleChartChange = (value: string) => {
      if (onMetricChange) {
        onMetricChange(value)
      }
      setActiveChart(value)
    }

    React.useEffect(() => {
      if (activeMetric) {
        setActiveChart(activeMetric)
      }
    }, [activeMetric])

    return (
      <div className="flex w-full items-start gap-4" ref={ref} {...props}>
        <ChartContainer
          config={chartConfig}
          className="min-h-[250px] w-full"
        >
          <PieChart>
            <ChartStyle />
            <ChartTooltip
              cursor={false}
              content={customTooltipContent || <ChartTooltipContent hideLabel />}
            />
            <Pie
              data={data}
              dataKey={category}
              nameKey={index}
              innerRadius={variant === "donut" ? 80 : 0}
              strokeWidth={1}
              stroke="#fff"
              {...(label &&
                labelPosition === "inside" && {
                  label: ({
                    payload,
                    percent,
                  }: {
                    payload: PieSectorDataItem
                    percent: number
                  }) => {
                    return (
                      <text
                        x={0}
                        y={0}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fill: "hsl(var(--foreground))",
                          fontSize: 12,
                          ...labelStyle
                        }}
                      >
                        {`${(percent * 100).toFixed(0)}%`}
                      </text>
                    )
                  },
                  labelLine: false,
                })}
              {...(label &&
                labelPosition === "outside" && {
                  label: ({
                    cx,
                    cy,
                    midAngle,
                    innerRadius,
                    outerRadius,
                    value,
                    percent,
                    payload,
                  }) => {
                    const RADIAN = Math.PI / 180
                    const sin = Math.sin(-RADIAN * midAngle)
                    const cos = Math.cos(-RADIAN * midAngle)
                    const sx = cx + (outerRadius + 10) * cos
                    const sy = cy + (outerRadius + 10) * sin
                    const mx = cx + (outerRadius + 30) * cos
                    const my = cy + (outerRadius + 30) * sin
                    const ex = mx + (cos >= 0 ? 1 : -1) * 22
                    const ey = my
                    const textAnchor = cos >= 0 ? "start" : "end"

                    return (
                      <g>
                        <Sector
                          cx={cx}
                          cy={cy}
                          innerRadius={innerRadius}
                          outerRadius={outerRadius}
                          startAngle={payload.startAngle}
                          endAngle={payload.endAngle}
                          fill={payload.fill}
                        />
                        <path
                          d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
                          stroke={payload.fill}
                          fill="none"
                        />
                        <circle
                          cx={ex}
                          cy={ey}
                          r={2}
                          fill={payload.fill}
                          stroke="none"
                        />
                        <text
                          x={ex + (cos >= 0 ? 1 : -1) * 12}
                          y={ey}
                          textAnchor={textAnchor}
                          dominantBaseline="central"
                          fill="hsl(var(--foreground))"
                          style={{
                            fontSize: "12px",
                            ...labelStyle
                          }}
                        >
                          {payload.name}
                        </text>
                      </g>
                    )
                  },
                  labelLine: false,
                })}
            >
              {data.map((entry, i) => (
                <Cell key={`cell-${i}`} fill={chartConfig[entry.name]?.color} />
              ))}
              {variant === "donut" && (
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      const { cx, cy } = viewBox
                      const labelColor = document.documentElement.classList.contains('dark') ? '#fff' : '#000';
                      return (
                        <>
                          <text
                            x={cx}
                            y={(cy || 0) - 16}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="fill-foreground text-sm"
                            style={{ fill: labelColor }}
                          >
                            {activeCategory}
                          </text>
                          <text
                            x={cx}
                            y={(cy || 0) + 4}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={cx}
                              y={(cy || 0) + 4}
                              className="fill-foreground text-2xl font-bold"
                              style={{ fill: labelColor }}
                            >
                              {data
                                .find((d) => d[index] === activeCategory)
                                ?.[category]?.toLocaleString() ||
                                total.toLocaleString()}
                            </tspan>
                            <tspan
                              x={cx}
                              y={(cy || 0) + 24}
                              className="fill-muted-foreground"
                              style={{ fill: labelColor }}
                            >
                              {activeCategory ? "" : "Total"}
                            </tspan>
                          </text>
                        </>
                      )
                    }
                  }}
                />
              )}
            </Pie>
          </PieChart>
        </ChartContainer>
      </div>
    )
  }
)

DonutChart.displayName = "DonutChart"

export { DonutChart }

    