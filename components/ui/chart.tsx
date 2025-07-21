"use client";
import { Area,
import { YAxis
} from "recharts";

interface ChartProps {
	data: any[];
	className?: string;
	height?: number;
}

interface LineChartProps extends ChartProps {
	dataKey: string;
	color?: string;
}

interface AreaChartProps extends ChartProps {
	dataKey: string;
	color?: string;
}

interface BarChartProps extends ChartProps {
	dataKey: string;
	color?: string;
}

interface PieChartProps extends ChartProps {
	dataKey: string;
	nameKey: string;
	colors?: string[];
}

export function SimpleLineChart({
	data,
	dataKey,
	color = "#8884d8",
	height = 300,
	className = "",
}: LineChartProps) {
	return (
		<div className={className} style={{ width: "100%", height }}>
			<ResponsiveContainer>
				<LineChart data={data}>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis dataKey="name" />
					<YAxis />
					<Tooltip />
					<Line
						dataKey={dataKey}
						stroke={color}
						strokeWidth={2}
						type="monotone"
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}

export function SimpleAreaChart({
	data,
	dataKey,
	color = "#8884d8",
	height = 300,
	className = "",
}: AreaChartProps) {
	return (
		<div className={className} style={{ width: "100%", height }}>
			<ResponsiveContainer>
				<AreaChart data={data}>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis dataKey="name" />
					<YAxis />
					<Tooltip />
					<Area
						dataKey={dataKey}
						fill={color}
						fillOpacity={0.6}
						stroke={color}
						type="monotone"
					/>
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
}

export function SimpleBarChart({
	data,
	dataKey,
	color = "#8884d8",
	height = 300,
	className = "",
}: BarChartProps) {
	return (
		<div className={className} style={{ width: "100%", height }}>
			<ResponsiveContainer>
				<BarChart data={data}>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis dataKey="name" />
					<YAxis />
					<Tooltip />
					<Bar dataKey={dataKey} fill={color} />
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}

export function SimplePieChart({
	data,
	dataKey,
	nameKey,
	colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00"],
	height = 300,
	className = "",
}: PieChartProps) {
	return (
		<div className={className} style={{ width: "100%", height }}>
			<ResponsiveContainer>
				<RechartsPieChart>
					<Pie
						cx="50%"
						cy="50%"
						data={data}
						dataKey={dataKey}
						fill="#8884d8"
						label
						nameKey={nameKey}
						outerRadius={80}
					>
						{data.map((entry, index) => (
							<Cell
								fill={colors[index % colors.length]}
								key={`cell-${index}`}
							/>
						))}
					</Pie>
					<Tooltip />
					<Legend />
				</RechartsPieChart>
			</ResponsiveContainer>
		</div>
	);
}
