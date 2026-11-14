import { useEffect, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, Container, Divider,
  IconButton, Stack, ToggleButton, ToggleButtonGroup, Typography
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SportsEsportsRoundedIcon from "@mui/icons-material/SportsEsportsRounded";
import { initialScore, reduceScore, type ScoreState, type TeamId } from "./domain/game";
import { database, saveGameAndEvents, type LocalGame } from "./infrastructure/database";

const defaultGame: LocalGame = {
  id: "active",
  teamAName: "Dupla 1",
  teamBName: "Dupla 2",
  score: initialScore(12),
  updatedAt: new Date().toISOString()
};

export default function App() {
  const [game, setGame] = useState<LocalGame>(defaultGame);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");

  useEffect(() => {
    let active = true;
    database.games.get("active")
      .then(async (stored) => {
        const current = stored ?? defaultGame;
        if (!stored) await database.games.put(current);
        if (active) setGame(current);
      })
      .catch(() => {
        if (active) setStorageError("Não foi possível acessar o armazenamento local deste navegador.");
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => { active = false; };
  }, []);

  async function applyCommand(teamId: TeamId, type: "ADD_POINT" | "REMOVE_POINT") {
    const result = reduceScore(game.score, { type, teamId });
    if (!result.ok) return;

    const updated: LocalGame = { ...game, score: result.state, updatedAt: new Date().toISOString() };
    setGame(updated);
    try {
      await saveGameAndEvents(updated, result.events);
      setStorageError("");
    } catch {
      setStorageError("Falha ao salvar a alteração. Verifique o armazenamento do navegador.");
    }
  }

  async function resetGame(targetScore = game.score.targetScore) {
    const result = reduceScore(game.score, { type: "RESET", targetScore });
    if (!result.ok) return;
    const updated: LocalGame = { ...game, score: result.state, updatedAt: new Date().toISOString() };
    setGame(updated);
    try {
      await saveGameAndEvents(updated, result.events);
      setStorageError("");
    } catch {
      setStorageError("Falha ao salvar o reinício da partida.");
    }
  }

  function teamPanel(teamId: TeamId, name: string, score: number) {
    const winner = game.score.winner === teamId;
    return (
      <Card elevation={2} sx={{ flex: 1, minWidth: 0, border: winner ? "2px solid" : "1px solid", borderColor: winner ? "success.main" : "divider" }}>
        <CardContent sx={{ textAlign: "center", p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" noWrap>{name}</Typography>
          <Typography variant="h2" fontWeight={800} sx={{ my: 2, fontVariantNumeric: "tabular-nums" }}>{score}</Typography>
          {winner && <Alert severity="success" sx={{ mb: 2 }}>Vencedora</Alert>}
          <Stack direction="row" justifyContent="center" spacing={1}>
            <IconButton aria-label={`Remover ponto de ${name}`} color="inherit" disabled={!ready || score === 0 || game.score.finished} onClick={() => void applyCommand(teamId, "REMOVE_POINT")} sx={{ border: 1, borderColor: "divider" }}>
              <RemoveRoundedIcon />
            </IconButton>
            <Button aria-label={`Adicionar ponto para ${name}`} variant="contained" size="large" startIcon={<AddRoundedIcon />} disabled={!ready || game.score.finished} onClick={() => void applyCommand(teamId, "ADD_POINT")}>Ponto</Button>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 3, sm: 6 } }}>
      <Stack spacing={3}>
        <Box textAlign="center">
          <SportsEsportsRoundedIcon color="primary" sx={{ fontSize: 42 }} />
          <Typography variant="h4" fontWeight={900}>Truco Intelligence</Typography>
          <Typography color="text.secondary">Contador de pontos • funciona offline</Typography>
        </Box>

        {storageError && <Alert severity="error">{storageError}</Alert>}

        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
              <Typography fontWeight={700}>Pontos para vencer</Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={game.score.targetScore}
                onChange={(_, value: 12 | 15 | null) => { if (value) void resetGame(value); }}
                aria-label="Pontuação alvo"
              >
                <ToggleButton value={12}>12 pontos</ToggleButton>
                <ToggleButton value={15}>15 pontos</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </CardContent>
        </Card>

        <Stack direction="row" spacing={1.5}>
          {teamPanel("team-a", game.teamAName, game.score.teamA)}
          {teamPanel("team-b", game.teamBName, game.score.teamB)}
        </Stack>

        {game.score.finished && (
          <Alert severity="success">
            Partida encerrada. {game.score.winner === "team-a" ? game.teamAName : game.teamBName} venceu.
          </Alert>
        )}

        <Divider />
        <Button variant="outlined" color="inherit" startIcon={<RestartAltRoundedIcon />} onClick={() => void resetGame()} disabled={!ready}>
          Nova partida
        </Button>
        <Typography variant="caption" color="text.secondary" textAlign="center">
          {ready ? "Partida salva neste dispositivo" : "Carregando dados locais…"}
        </Typography>
      </Stack>
    </Container>
  );
}
