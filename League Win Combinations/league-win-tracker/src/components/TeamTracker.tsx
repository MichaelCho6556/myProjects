// TeamTracker.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Plus, Minus } from "lucide-react";

const ChartWrapper = dynamic(() => import("./ChartWrapper"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full bg-gray-800/50 animate-pulse rounded-xl" />
  ),
});

const STORAGE_KEY = "team-compositions-data";
const roles = ["ADC", "Assassin", "Bruiser", "Tank", "Mage", "Support"];

interface Composition {
  id: number;
  combination: string;
  wins: number;
  loss: number;
}

interface NewCompositionForm {
  isOpen: boolean;
  firstRole: string;
  secondRole: string;
}

const defaultCompositions = [
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
];

const TeamTracker: React.FC = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [compositions, setCompositions] =
    useState<Composition[]>(defaultCompositions);
  const [newCompositionForm, setNewCompositionForm] =
    useState<NewCompositionForm>({
      isOpen: false,
      firstRole: roles[0],
      secondRole: roles[1],
    });

  useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          setCompositions(parsedData);
        }
      }
    } catch (error) {
      console.error("Error loading saved data:", error);
    } finally {
      setIsMounted(true);
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(compositions));
      } catch (error) {
        console.error("Error saving data:", error);
      }
    }
  }, [compositions, isMounted]);

  const calculateWinRate = (wins: number, losses: number): string => {
    const total = wins + losses;
    return total === 0 ? "0" : ((wins / total) * 100).toFixed(1);
  };

  const stats = useMemo(() => {
    const totalGames = compositions.reduce(
      (sum, comp) => sum + comp.wins + comp.loss,
      0
    );

    const bestComposition = compositions
      .filter((comp) => comp.wins + comp.loss > 0)
      .reduce((best, current) => {
        const currentWinRate =
          (current.wins / (current.wins + current.loss)) * 100;
        const bestWinRate = (best.wins / (best.wins + best.loss)) * 100;
        return currentWinRate > bestWinRate ? current : best;
      }, compositions[0]);

    const mostPlayed = compositions.reduce((prev, current) =>
      prev.wins + prev.loss > current.wins + current.loss ? prev : current
    );

    return {
      totalGames,
      bestComposition,
      mostPlayed,
    };
  }, [compositions]);

  const chartData = useMemo(
    () =>
      compositions
        .filter((comp) => comp.wins + comp.loss > 0)
        .map((comp) => ({
          combination: comp.combination,
          winRate: Number(calculateWinRate(comp.wins, comp.loss)),
        }))
        .sort((a, b) => b.winRate - a.winRate),
    [compositions]
  );

  const updateScore = (
    id: number,
    type: "wins" | "loss",
    operation: "increment" | "decrement"
  ) => {
    setCompositions((prevComps) =>
      prevComps.map((comp) => {
        if (comp.id === id) {
          const currentValue = comp[type];
          if (operation === "decrement" && currentValue === 0) return comp;
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

  const addNewComposition = () => {
    const { firstRole, secondRole } = newCompositionForm;
    const isSameRole = firstRole === secondRole;
    const combination = isSameRole
      ? `2 ${firstRole}s`
      : `1 ${firstRole} / 1 ${secondRole}`;

    if (compositions.some((comp) => comp.combination === combination)) {
      alert("This combination already exists!");
      return;
    }

    const newId = Math.max(...compositions.map((comp) => comp.id)) + 1;
    setCompositions((prev) => [
      ...prev,
      { id: newId, combination, wins: 0, loss: 0 },
    ]);
    setNewCompositionForm((prev) => ({ ...prev, isOpen: false }));
  };

  const deleteComposition = (id: number) => {
    if (window.confirm("Are you sure you want to delete this composition?")) {
      setCompositions((prev) => prev.filter((comp) => comp.id !== id));
    }
  };

  const CompositionCard = ({ comp }: { comp: Composition }) => {
    const winRate = Number(calculateWinRate(comp.wins, comp.loss));

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="group relative p-6 bg-gray-800/40 rounded-xl border border-gray-700/50 backdrop-blur-sm transition-all duration-200 hover:bg-gray-800/60"
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h4 className="text-lg font-medium text-gray-100">
              {comp.combination}
            </h4>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm font-medium bg-gray-900/50 px-3 py-1 rounded-full text-gray-300">
                {comp.wins}W - {comp.loss}L
              </span>
              <span
                className={`text-sm font-medium px-3 py-1 rounded-full ${
                  winRate >= 50
                    ? "bg-emerald-900/50 text-emerald-200"
                    : "bg-red-900/50 text-red-200"
                }`}
              >
                {winRate}% Win Rate
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-1">
                <Button
                  onClick={() => updateScore(comp.id, "wins", "increment")}
                  className="h-8 w-8 bg-emerald-600 hover:bg-emerald-500 p-0"
                >
                  <Plus size={16} />
                </Button>
                <Button
                  onClick={() => updateScore(comp.id, "wins", "decrement")}
                  className="h-8 w-8 bg-emerald-700 hover:bg-emerald-600 p-0"
                  disabled={comp.wins === 0}
                >
                  <Minus size={16} />
                </Button>
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  onClick={() => updateScore(comp.id, "loss", "increment")}
                  className="h-8 w-8 bg-red-600 hover:bg-red-500 p-0"
                >
                  <Plus size={16} />
                </Button>
                <Button
                  onClick={() => updateScore(comp.id, "loss", "decrement")}
                  className="h-8 w-8 bg-red-700 hover:bg-red-600 p-0"
                  disabled={comp.loss === 0}
                >
                  <Minus size={16} />
                </Button>
              </div>
            </div>

            <Button
              onClick={() => deleteComposition(comp.id)}
              className="h-8 w-8 bg-gray-700 hover:bg-red-600 p-0 transition-colors duration-200"
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <Card className="border-gray-700 bg-gray-800/90 shadow-xl backdrop-blur-sm">
        <CardHeader>
          <div className="flex justify-between items-center mb-6">
            <CardTitle className="text-2xl font-bold text-white">
              Team Composition Statistics
            </CardTitle>
            <Button
              onClick={() =>
                setNewCompositionForm((prev) => ({ ...prev, isOpen: true }))
              }
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              Add New Composition
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-blue-900/30 rounded-xl border border-blue-700/50 shadow-lg hover:bg-blue-900/40 transition-all duration-200"
            >
              <div className="text-lg font-semibold text-blue-100">
                Total Games
              </div>
              <div className="text-4xl font-bold text-blue-200 mt-2">
                {stats.totalGames}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-6 bg-emerald-900/30 rounded-xl border border-emerald-700/50 shadow-lg hover:bg-emerald-900/40 transition-all duration-200"
            >
              <div className="text-lg font-semibold text-emerald-100">
                Best Win Rate
              </div>
              <div className="text-xl font-bold text-emerald-200 mt-2">
                {stats.bestComposition?.combination}
              </div>
              <div className="text-emerald-300 mt-1">
                {(
                  (stats.bestComposition?.wins /
                    (stats.bestComposition?.wins +
                      stats.bestComposition?.loss)) *
                  100
                ).toFixed(1)}
                % Win Rate
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-6 bg-purple-900/30 rounded-xl border border-purple-700/50 shadow-lg hover:bg-purple-900/40 transition-all duration-200"
            >
              <div className="text-lg font-semibold text-purple-100">
                Most Played
              </div>
              <div className="text-xl font-bold text-purple-200 mt-2">
                {stats.mostPlayed?.combination}
              </div>
              <div className="text-purple-300 mt-1">
                {stats.mostPlayed?.wins + stats.mostPlayed?.loss} Games
              </div>
            </motion.div>
          </div>

          {newCompositionForm.isOpen && (
            <div className="mt-4 p-4 bg-gray-900/50 rounded-xl border border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  value={newCompositionForm.firstRole}
                  onChange={(e) =>
                    setNewCompositionForm((prev) => ({
                      ...prev,
                      firstRole: e.target.value,
                    }))
                  }
                  className="bg-gray-800 text-white rounded-lg p-2 border border-gray-700"
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <select
                  value={newCompositionForm.secondRole}
                  onChange={(e) =>
                    setNewCompositionForm((prev) => ({
                      ...prev,
                      secondRole: e.target.value,
                    }))
                  }
                  className="bg-gray-800 text-white rounded-lg p-2 border border-gray-700"
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-4 mt-4">
                <Button
                  onClick={addNewComposition}
                  className="bg-green-600 hover:bg-green-500 text-white"
                >
                  Add Composition
                </Button>
                <Button
                  onClick={() =>
                    setNewCompositionForm((prev) => ({
                      ...prev,
                      isOpen: false,
                    }))
                  }
                  className="bg-red-600 hover:bg-red-500 text-white"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <div className="space-y-8">
            <div className="relative">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm p-4 rounded-t-xl border-b border-gray-700"
              >
                <h3 className="text-xl font-bold text-white">Win Rates</h3>
              </motion.div>
              <div className="p-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full overflow-hidden bg-gray-900/50 p-6 rounded-xl border border-gray-700 shadow-lg"
                >
                  <ChartWrapper data={chartData} />
                </motion.div>
              </div>
            </div>

            <div className="relative">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm p-4 rounded-t-xl border-b border-gray-700"
              >
                <h3 className="text-xl font-bold text-white">Update Records</h3>
              </motion.div>
              <div className="p-4">
                <AnimatePresence mode="popLayout">
                  {compositions.map((comp, index) => (
                    <motion.div
                      key={comp.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className="mb-4"
                    >
                      <CompositionCard comp={comp} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamTracker;
