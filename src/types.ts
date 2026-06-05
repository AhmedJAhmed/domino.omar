/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Round {
  id: string;
  team1Added: number;
  team2Added: number;
  team1Total: number;
  team2Total: number;
  timestamp: string;
}

export interface MatchHistory {
  id: string;
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
  winner: 'team1' | 'team2';
  timestamp: string;
}

export interface GameSettings {
  team1Name: string;
  team2Name: string;
  winningScore: number;
  soundEnabled: boolean;
  theme: 'light' | 'dark';
  vibrationEnabled: boolean;
}
