"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScoringRulesTab } from "@/components/gamification/scoring-rules-tab";
import { SeasonsTab } from "@/components/gamification/seasons-tab";
import { ParticipantsTab } from "@/components/gamification/participants-tab";
import { LevelsTab } from "@/components/gamification/levels-tab";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  gamificationEnabled: boolean;
  seasonType: string;
  resetPointsOnEnd: boolean;
  teamMode: boolean;
  participantsCount: number;
  scoringRulesCount: number;
  seasonsCount: number;
  levelsCount: number;
}

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      const json = await res.json();
      if (json.success) {
        setCampaign(json.data);
      } else {
        toast.error("Campanha não encontrada");
        router.push("/campaigns");
      }
    } catch {
      toast.error("Erro ao carregar campanha");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!campaign) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/campaigns")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
            <Badge variant={campaign.isActive ? "default" : "secondary"}>
              {campaign.isActive ? "Ativa" : "Inativa"}
            </Badge>
          </div>
          {campaign.description && (
            <p className="text-muted-foreground mt-1">{campaign.description}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="scoring-rules">
        <TabsList variant="line">
          <TabsTrigger value="scoring-rules">
            Regras de Pontuação
          </TabsTrigger>
          <TabsTrigger value="seasons">
            Temporadas
          </TabsTrigger>
          <TabsTrigger value="participants">
            Participantes
          </TabsTrigger>
          <TabsTrigger value="levels">
            Níveis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scoring-rules">
          <ScoringRulesTab campaignId={id} />
        </TabsContent>

        <TabsContent value="seasons">
          <SeasonsTab campaignId={id} />
        </TabsContent>

        <TabsContent value="participants">
          <ParticipantsTab campaignId={id} />
        </TabsContent>

        <TabsContent value="levels">
          <LevelsTab campaignId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
