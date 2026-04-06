"use client";

import { useState, useEffect } from "react";
import { Trophy } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface RankingEntry {
  position: number;
  sellerId: string;
  sellerName: string;
  totalPoints: number;
  currentLevel: {
    name: string;
    badgeEmoji: string | null;
    minPoints: number;
  } | null;
  nextLevel: {
    name: string;
    minPoints: number;
  } | null;
}

interface RankingData {
  campaign: { id: string; name: string };
  season: { id: string; name: string } | null;
  ranking: RankingEntry[];
  levels: Array<{ name: string; minPoints: number; badgeEmoji: string | null }>;
}

function getPositionStyle(position: number): string {
  if (position === 1) return "text-amber-500 font-bold";
  if (position === 2) return "text-slate-400 font-bold";
  if (position === 3) return "text-amber-700 font-bold";
  return "text-muted-foreground";
}

function getPositionLabel(position: number): string {
  if (position === 1) return "1";
  if (position === 2) return "2";
  if (position === 3) return "3";
  return String(position);
}

export function RankingWidget() {
  const [data, setData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    async function fetchRanking() {
      try {
        const res = await fetch("/api/dashboard/gamification-ranking");
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
          setHasData(true);
        } else {
          setHasData(false);
        }
      } catch {
        setHasData(false);
      } finally {
        setLoading(false);
      }
    }
    fetchRanking();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Don't render anything if there's no active campaign
  if (!hasData || !data) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-5 text-amber-500" />
          Ranking — {data.campaign.name}
        </CardTitle>
        {data.season && (
          <CardDescription>
            Temporada: {data.season.name}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {!data.season ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma temporada ativa nesta campanha.
          </p>
        ) : data.ranking.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum ponto registrado nesta temporada.
          </p>
        ) : (
          <div className="space-y-2">
            {data.ranking.map((entry) => {
              // Calculate progress to next level
              let progressPercent = 100;
              if (entry.nextLevel && entry.currentLevel) {
                const range = entry.nextLevel.minPoints - entry.currentLevel.minPoints;
                const current = entry.totalPoints - entry.currentLevel.minPoints;
                progressPercent = range > 0 ? Math.min(100, Math.round((current / range) * 100)) : 100;
              } else if (!entry.currentLevel) {
                // Below first level
                if (data.levels.length > 0) {
                  progressPercent = Math.min(100, Math.round((entry.totalPoints / data.levels[0].minPoints) * 100));
                }
              }

              return (
                <div key={entry.sellerId} className="flex items-center gap-3 py-1.5">
                  {/* Position */}
                  <span className={`w-6 text-center text-sm ${getPositionStyle(entry.position)}`}>
                    {getPositionLabel(entry.position)}
                  </span>

                  {/* Level badge */}
                  <span className="w-6 text-center text-base">
                    {entry.currentLevel?.badgeEmoji ?? ""}
                  </span>

                  {/* Name and level info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{entry.sellerName}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {entry.totalPoints.toLocaleString("pt-BR")} pts
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      {entry.currentLevel && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {entry.currentLevel.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
