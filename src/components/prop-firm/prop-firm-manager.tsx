"use client";

import { useState, useEffect } from "react";
import { PropFirm, PropFirmChallenge, DrawdownType } from "@/lib/types/prop-firms";
import { getPropFirms, getFirmChallenges, upsertPropFirm, upsertChallenge } from "@/lib/api/prop-firms";
import { Loader2, Save, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button"; // Assuming you have a Button component or use standard button

export function PropFirmManager() {
  const [firms, setFirms] = useState<PropFirm[]>([]);
  const [selectedFirmId, setSelectedFirmId] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<PropFirmChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load firms on mount
  useEffect(() => {
    loadFirms();
  }, []);

  // Load challenges when firm selected
  useEffect(() => {
    if (selectedFirmId) {
      loadChallenges(selectedFirmId);
    } else {
      setChallenges([]);
    }
  }, [selectedFirmId]);

  async function loadFirms() {
    try {
      setLoading(true);
      const data = await getPropFirms();
      setFirms(data);
      if (data.length > 0 && !selectedFirmId) {
        setSelectedFirmId(data[0].id);
      }
    } catch (error) {
      console.error("Failed to load firms:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadChallenges(firmId: string) {
    try {
      setLoading(true);
      const data = await getFirmChallenges(firmId);
      setChallenges(data);
    } catch (error) {
      console.error("Failed to load challenges:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleChallengeChange = (index: number, field: keyof PropFirmChallenge, value: any) => {
    const updated = [...challenges];
    updated[index] = { ...updated[index], [field]: value };
    setChallenges(updated);
  };

  const handleSaveChallenge = async (challenge: PropFirmChallenge) => {
    try {
      setSaving(true);
      await upsertChallenge(challenge);
      // Optional: Toast success
    } catch (error) {
      console.error("Failed to save challenge:", error);
      // Optional: Toast error
    } finally {
      setSaving(false);
    }
  };

  const handleAddChallenge = () => {
    if (!selectedFirmId) return;
    
    const newChallenge: PropFirmChallenge = {
        id: crypto.randomUUID(), // Temporary ID until saved? Or let DB generate? 
        // Ideally we let DB generate but for UI state we need a key. 
        // Using upsert with a new UUID works if we want to determine ID locally.
        firm_id: selectedFirmId,
        name: "New Challenge",
        phase_name: "Phase 1",
        phase_order: 1,
        initial_balance: 100000,
        drawdown_type: "balance",
        is_active: true,
        created_at: new Date().toISOString()
    } as PropFirmChallenge;

    setChallenges([...challenges, newChallenge]);
  };

  if (loading && firms.length === 0) {
      return <div className="p-8 text-center text-muted-foreground">Loading Prop Firms...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Firm Selector */}
      <div className="flex items-center gap-4">
        <div className="w-[300px]">
             <Label htmlFor="firm-select" className="mb-2 block">Select Firm</Label>
             <Select value={selectedFirmId || ""} onValueChange={setSelectedFirmId}>
                <SelectTrigger id="firm-select" className="bg-void border-white/10">
                    <SelectValue placeholder="Select a firm" />
                </SelectTrigger>
                <SelectContent>
                    {firms.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                </SelectContent>
             </Select>
        </div>
        {/* Add Firm Button could go here */}
      </div>

      {/* Challenges Editor */}
      {selectedFirmId && (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Challenges & Rules</h3>
                <button className="btn-glow text-xs" onClick={handleAddChallenge}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Challenge
                </button>
            </div>

            <div className="grid gap-6">
                {challenges.map((challenge, index) => (
                    <div key={challenge.id} className="card-void p-6 space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             <div className="space-y-2">
                                <Label>Challenge Name</Label>
                                <Input 
                                    value={challenge.name} 
                                    className="bg-void-surface border-white/10"
                                    onChange={(e) => handleChallengeChange(index, "name", e.target.value)}
                                />
                             </div>
                             <div className="space-y-2">
                                <Label>Phase Name</Label>
                                <Input 
                                    value={challenge.phase_name} 
                                    className="bg-void-surface border-white/10"
                                    onChange={(e) => handleChallengeChange(index, "phase_name", e.target.value)}
                                />
                             </div>
                             <div className="space-y-2">
                                <Label>Initial Balance</Label>
                                <Input 
                                    type="number"
                                    value={challenge.initial_balance} 
                                    className="bg-void-surface border-white/10"
                                    onChange={(e) => handleChallengeChange(index, "initial_balance", parseFloat(e.target.value))}
                                />
                             </div>
                             <div className="space-y-2">
                                <Label>Drawdown Type</Label>
                                <Select 
                                    value={challenge.drawdown_type} 
                                    onValueChange={(v) => handleChallengeChange(index, "drawdown_type", v)}
                                >
                                    <SelectTrigger className="bg-void-surface border-white/10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="balance">Balance Based</SelectItem>
                                        <SelectItem value="equity">Equity Based</SelectItem>
                                        <SelectItem value="relative">Relative</SelectItem>
                                        <SelectItem value="trailing">Trailing</SelectItem>
                                    </SelectContent>
                                </Select>
                             </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label>Daily Loss %</Label>
                                <Input 
                                    type="number"
                                    step="0.1"
                                    placeholder="e.g. 5.0"
                                    value={challenge.daily_loss_percent || ""} 
                                    className="bg-void-surface border-white/10"
                                    onChange={(e) => handleChallengeChange(index, "daily_loss_percent", parseFloat(e.target.value))}
                                />
                             </div>
                             <div className="space-y-2">
                                <Label>Max Loss %</Label>
                                <Input 
                                    type="number"
                                    step="0.1"
                                    placeholder="e.g. 10.0"
                                    value={challenge.max_loss_percent || ""} 
                                    className="bg-void-surface border-white/10"
                                    onChange={(e) => handleChallengeChange(index, "max_loss_percent", parseFloat(e.target.value))}
                                />
                             </div>
                             <div className="space-y-2">
                                <Label>Profit Target %</Label>
                                <Input 
                                    type="number"
                                    step="0.1"
                                    placeholder="e.g. 10.0"
                                    value={challenge.profit_target_percent || ""} 
                                    className="bg-void-surface border-white/10"
                                    onChange={(e) => handleChallengeChange(index, "profit_target_percent", parseFloat(e.target.value))}
                                />
                             </div>
                             <div className="space-y-2 flex items-end">
                                <button 
                                    className="btn-void w-full justify-center" 
                                    disabled={saving}
                                    onClick={() => handleSaveChallenge(challenge)}
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save</>}
                                </button>
                             </div>
                        </div>
                        
                        {/* Advanced / Amount Based Overrides */}
                         <div className="pt-2 border-t border-white/5">
                            <details className="text-sm">
                                <summary className="cursor-pointer text-muted-foreground hover:text-white">Advanced Rules (Fixed Amounts / Trailing)</summary>
                                <div className="grid grid-cols-3 gap-4 mt-4">
                                     <div className="space-y-2">
                                        <Label className="text-xs">Daily Loss Amount ($)</Label>
                                        <Input 
                                            type="number"
                                            value={challenge.daily_loss_amount || ""} 
                                            className="bg-void-surface border-white/10 h-8 text-sm"
                                            onChange={(e) => handleChallengeChange(index, "daily_loss_amount", e.target.value ? parseFloat(e.target.value) : null)}
                                        />
                                     </div>
                                     <div className="space-y-2">
                                        <Label className="text-xs">Max Loss Amount ($)</Label>
                                        <Input 
                                            type="number"
                                            value={challenge.max_loss_amount || ""} 
                                            className="bg-void-surface border-white/10 h-8 text-sm"
                                            onChange={(e) => handleChallengeChange(index, "max_loss_amount", e.target.value ? parseFloat(e.target.value) : null)}
                                        />
                                     </div>
                                     <div className="space-y-2">
                                        <Label className="text-xs">Trailing Threshold ($)</Label>
                                        <Input 
                                            type="number"
                                            value={challenge.trailing_threshold_amount || ""} 
                                            className="bg-void-surface border-white/10 h-8 text-sm"
                                            onChange={(e) => handleChallengeChange(index, "trailing_threshold_amount", e.target.value ? parseFloat(e.target.value) : null)}
                                        />
                                     </div>
                                </div>
                            </details>
                         </div>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
}
