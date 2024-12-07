"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

interface Composition {
  id: number;
  combination: string;
  wins: number;
  loss: number;
}

interface ChartData {
  combination: string;
  winRate: number;
}

const TeamTracker: React.FC = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const [compositions, setCompositions] = useState<Composition[]>([
    { id: 1, combination: "1 ADC / 1 Assassin", wins: 1, loss: 1 },
    { id: 2, combination: "1 ADC / 1 Bruiser", wins: 3, loss: 1 },
    { id: 3, combination: "1 ADC / 1 Tank", wins: 3, loss: 1 },
    { id: 4, combination: "1 Assassin / 1 Bruiser", wins: 1, loss: 1 },
    { id: 5, combination: "1 Assassin / 1 Tank", wins: 0, loss: 1 },
    { id: 6, combination: "1 Bruiser / 1 Tank", wins: 0, loss: 0 },
    { id: 7, combination: "1 Mage / 1 ADC", wins: 2, loss: 2 },
    { id: 8, combination: "1 Mage / 1 Assassin", wins: 0, loss: 4 },
    { id: 9, combination: "1 Mage / 1 Bruiser", wins: 7, loss: 2 },
    { id: 10, combination: "1 Mage / 1 Tank", wins: 3, loss: 4 },
    { id: 11, combination: "1 Support / 1 Anything", wins: 0, loss: 0 },
    { id: 12, combination: "2 ADC", wins: 0, loss: 0 },
    { id: 13, combination: "2 Bruisers", wins: 0, loss: 0 },
    { id: 14, combination: "2 Mages", wins: 0, loss: 0 },
    { id: 15, combination: "2 Supports", wins: 0, loss: 0 },
    { id: 16, combination: "2 Tanks", wins: 0, loss: 0 },
  ]);

  const calculateWinRate = (wins: number, losses: number): string => {
    const total = wins + losses;
    return total === 0 ? "0" : ((wins / total) * 100).toFixed(1);
  };

  const updateScore = (
    id: number,
    type: "wins" | "loss",
    operation: "increment" | "decrement"
  ): void => {
    setCompositions((prevComps) =>
      prevComps.map((comp) => {
        if (comp.id === id) {
          const currentValue = comp[type];
          if (operation === "decrement" && currentValue === 0) {
            return comp;
          }
          return {
            ...comp,
            [type]:
              operation === "increment" ? currentValue + 1 : currentValue - 1,
          };
        }
        return comp;
      })
    );
  };

  const chartData: ChartData[] = compositions
    .filter((comp) => comp.wins + comp.loss > 0)
    .map((comp) => ({
      combination: comp.combination,
      winRate: Number(calculateWinRate(comp.wins, comp.loss)),
    }))
    .sort((a, b) => b.winRate - a.winRate);

  const totalGames = compositions.reduce(
    (sum, comp) => sum + comp.wins + comp.loss,
    0
  );
  const bestComposition = chartData[0] || { combination: "None", winRate: 0 };
  const mostPlayed = compositions.reduce((prev, current) =>
    prev.wins + prev.loss > current.wins + current.loss ? prev : current
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 bg-gray-900 min-h-screen">
      <Card className="border-gray-700 bg-gray-800/90 shadow-xl backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold text-white tracking-tight">
            Team Composition Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-6 bg-blue-900/30 rounded-xl border border-blue-700/50 shadow-lg hover:bg-blue-900/40 transition-all duration-200">
              <div className="text-lg font-semibold text-blue-100">
                Total Games
              </div>
              <div className="text-4xl font-bold text-blue-200 mt-2">
                {totalGames}
              </div>
            </div>
            <div className="p-6 bg-emerald-900/30 rounded-xl border border-emerald-700/50 shadow-lg hover:bg-emerald-900/40 transition-all duration-200">
              <div className="text-lg font-semibold text-emerald-100">
                Best Composition
              </div>
              <div className="text-xl font-bold text-emerald-200 mt-2">
                {bestComposition.combination}
              </div>
              <div className="text-emerald-300 mt-1 font-medium">
                {bestComposition.winRate}% Win Rate
              </div>
            </div>
            <div className="p-6 bg-purple-900/30 rounded-xl border border-purple-700/50 shadow-lg hover:bg-purple-900/40 transition-all duration-200">
              <div className="text-lg font-semibold text-purple-100">
                Most Played
              </div>
              <div className="text-xl font-bold text-purple-200 mt-2">
                {mostPlayed.combination}
              </div>
              <div className="text-purple-300 mt-1 font-medium">
                {mostPlayed.wins + mostPlayed.loss} Games
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-6 text-white">Win Rates</h3>
            <div className="w-full overflow-x-auto bg-gray-900/50 p-6 rounded-xl border border-gray-700 shadow-lg">
              <div style={{ minWidth: "600px", height: "400px" }}>
                {isClient && (
                  <BarChart
                    width={800}
                    height={400}
                    data={chartData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 60,
                      bottom: 100,
                    }}
                  >
                    <XAxis
                      dataKey="combination"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                      tick={{ fontSize: 12, fill: "#e5e7eb" }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 20, 40, 60, 80, 100]}
                      tick={{ fill: "#e5e7eb" }}
                      label={{
                        value: "Win Rate %",
                        angle: -90,
                        position: "insideLeft",
                        offset: -40,
                        fill: "#e5e7eb",
                      }}
                    />
                    <Tooltip
                      formatter={(value) => [`${value}%`, "Win Rate"]}
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: "0.5rem",
                        padding: "8px",
                      }}
                      labelStyle={{ color: "#e5e7eb" }}
                    />
                    <Bar
                      dataKey="winRate"
                      fill="#3b82f6"
                      name="Win Rate %"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-6 text-white">
              Update Records
            </h3>
            <div className="grid gap-4">
              {compositions.map((comp) => (
                <div
                  key={comp.id}
                  className="flex items-center justify-between p-6 bg-gray-900/50 rounded-xl border border-gray-700 hover:bg-gray-800/50 transition-all duration-200 group"
                >
                  <div className="flex-1">
                    <span className="font-medium text-gray-100 text-lg">
                      {comp.combination}
                    </span>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-sm bg-gray-800 px-3 py-1 rounded-full text-gray-300">
                        {comp.wins}W - {comp.loss}L
                      </span>
                      <span
                        className={`text-sm px-3 py-1 rounded-full ${
                          Number(calculateWinRate(comp.wins, comp.loss)) >= 50
                            ? "bg-green-900/50 text-green-200"
                            : "bg-red-900/50 text-red-200"
                        }`}
                      >
                        {calculateWinRate(comp.wins, comp.loss)}% Win Rate
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() =>
                          updateScore(comp.id, "wins", "increment")
                        }
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-lg"
                      >
                        + Win
                      </Button>
                      <Button
                        onClick={() =>
                          updateScore(comp.id, "wins", "decrement")
                        }
                        className="bg-emerald-800 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-lg opacity-75 hover:opacity-100"
                        disabled={comp.wins === 0}
                      >
                        - Win
                      </Button>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() =>
                          updateScore(comp.id, "loss", "increment")
                        }
                        className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-lg"
                      >
                        + Loss
                      </Button>
                      <Button
                        onClick={() =>
                          updateScore(comp.id, "loss", "decrement")
                        }
                        className="bg-red-800 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-lg opacity-75 hover:opacity-100"
                        disabled={comp.loss === 0}
                      >
                        - Loss
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamTracker;
