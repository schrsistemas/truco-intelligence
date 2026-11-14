import { useEffect, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, Container, Divider,
  IconButton, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SportsEsportsRoundedIcon from "@mui/icons-material/SportsEsportsRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import { initialScore, reduceScore, type TeamId } from "./domain/game";
import {
  createNewGame, database, getActiveGame, listRecentGames,
  saveGameAndEvents, selectGame, type LocalGame
} from "./infrastructure/database";

export default function App() {
  const [game, setGame] = useState<LocalGame | null>(null);
  const [history, setHistory] = useState<LocalGame[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [teamAName, setTeamAName] = useState("Dupla 1");
  const [teamBName, setTeamBName] = useState("Dupla 2");

  async function refreshHistory() {
    setHistory(await listRecentGames(20));
  }

  useEffect(() => {
    let active = true;
    getActiveGame()
      .then(async (current) => {
        if (!active) return;
        setGame(current);
        setTeamAName(current.teamAName);
        setTeamBName(current.teamBName);
        await refreshHistory();
      })
      .catch(() => {
        if (active) setStorageError("Não foi possível acessar o armazenamento local deste navegador.");
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => { active = false; };
  }, []);

  async function persistGame(updated: LocalGame, events: Parameters<typeof saveGameAndEvents>[1] = []) {
    setSaving(true);
    try {
      await saveGameAndEvents(updated, events);
      setGame(updated);
      setStorageError("");
      await refreshHistory();
    } catch {
      setStorageError("Falha ao salvar. A versão anterior foi preservada.");
    } finally {
      setSaving(false);
    }
  }

  async function applyCommand(teamId: TeamId, type: "ADD_POINT" | "REMOVE_POINT") {
    if (!game || saving || !ready) return;
    const result = reduceScore(game.score, { type, teamId });
    if (!result.ok) return;

    await persistGame({
      ...game,
      score: result.state,
      updatedAt: new Date().toISOString(),
      status: result.state.finished ? "finished" : "in-progress"
    }, result.events);
  }

  async function resetGame(targetScore = game?.score.targetScore) {
    if (!game || saving || !ready) return;
    const next = await createNewGame(game, targetScore ?? game.score.targetScore);
    setGame(next);
    setTeamAName(next.teamAName);
    setTeamBName(next.teamBName);
    await refreshHistory();
  }

  async function saveTeamNames() {
    if (!game || saving || !ready) return;
    const nameA = teamAName.trim();
    const nameB = teamBName.trim();
    if (!nameA || !nameB || nameA.length > 40 || nameB.length > 40) {
      setStorageError("Informe nomes entre 1 e 40 caracteres para as duas duplas.");
      return;
    }
    await persistGame({
      ...game,
      teamAName: nameA,
      teamBName: nameB,
      updatedAt: new Date().toISOString()
    });
  }

  async function openHistory(gameId: string) {
    if (saving) return;
    const selected = await selectGame(gameId);
    if (!selected) return;
    setGame(selected);
    setTeamAName(selected.teamAName);
    setTeamBName(selected.teamBName);
    setStorageError("");
  }

  function teamPanel(teamId: TeamId, name: string, score: number) {
    const winner = game?.score.winner === teamId;
    const isFinished = game?.score.finished ?? false;
    return (
      <Card elevation={2} sx={{ flex: 1, minWidth: 0, border: winner ? "2px solid" : "1px solid", borderColor: winner ? "success.main" : "divider" }}>
        <CardContent sx={{ textAlign: "center", p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" noWrap>{name}</Typography>
          <Typography variant="h2" fontWeight={800} sx={{ my: 2, fontVariantNumeric: "tabular-nums" }}>{score}</Typography>
          {winner && <Alert severity="success" sx={{ mb: 2 }}>Vencedora</Alert>}
          <Stack direction="row" justifyContent="center" spacing={1}>
            <IconButton aria-label={`Remover ponto de ${name}`} color="inherit" disabled={!ready || saving || score === 0 || isFinished} onClick={() => void applyCommand(teamId, "REMOVE_POINT")} sx={{ border: 1, borderColor: "divider" }}>
              <RemoveRoundedIcon />
            </IconButton>
            <Button aria-label={`Adicionar ponto para ${name}`} variant="contained" size="large" startIcon={<AddRoundedIcon />} disabled={!ready || saving || isFinished} onClick={() => void applyCommand(teamId, "ADD_POINT")}>Ponto</Button>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (!game) {
    return <Container maxWidth="sm" sx={{ py: 5 }}><Alert severity={storageError ? "error" : "info"}>{storageError || "Carregando partida local…"}</Alert></Container>;
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
            <Stack spacing={2}>
              <Typography fontWeight={700}>Identificação das duplas</Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <TextField label="Dupla 1" value={teamAName} onChange={(event) => setTeamAName(event.target.value)} size="small" inputProps={{ maxLength: 40 }} fullWidth disabled={saving} />
                <TextField label="Dupla 2" value={teamBName} onChange={(event) => setTeamBName(event.target.value)} size="small" inputProps={{ maxLength: 40 }} fullWidth disabled={saving} />
              </Stack>
              <Button variant="outlined" onClick={() => void saveTeamNames()} disabled={!ready || saving || !teamAName.trim() || !teamBName.trim()}>
                Salvar nomes
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
              <Typography fontWeight={700}>Pontos para vencer</Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={game.score.targetScore}
                onChange={(_, value: 12 | 15 | null) => { if (value && value !== game.score.targetScore) void resetGame(value); }}
                aria-label="Pontuação alvo"
              >
                <ToggleButton value={12} disabled={!ready || saving}>12 pontos</ToggleButton>
                <ToggleButton value={15} disabled={!ready || saving}>15 pontos</ToggleButton>
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
        <Button variant="contained" startIcon={<RestartAltRoundedIcon />} onClick={() => void resetGame()} disabled={!ready || saving}>
          Nova partida
        </Button>
        <Typography variant="caption" color="text.secondary" textAlign="center">
          {saving ? "Salvando partida…" : ready ? "Partida salva neste dispositivo" : "Carregando dados locais…"}
        </Typography>

        <Divider />
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <HistoryRoundedIcon color="action" />
            <Typography fontWeight={700}>Histórico recente</Typography>
          </Stack>
          {history.length === 0 && <Typography color="text.secondary" variant="body2">Nenhuma partida registrada.</Typography>}
          <Stack spacing={1}>
            {history.map((item) => (
              <Button
                key={item.id}
                variant={item.id === game.id ? "contained" : "outlined"}
                color="inherit"
                onClick={() => void openHistory(item.id)}
                disabled={saving}
                sx={{ justifyContent: "space-between", textTransform: "none" }}
              >
                <Box sx={{ textAlign: "left" }}>
                  <Typography variant="body2" fontWeight={700}>{item.teamAName} × {item.teamBName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(item.updatedAt).toLocaleString("pt-BR")} • {item.score.teamA} × {item.score.teamB}
                  </Typography>
                </Box>
                <Typography variant="caption">{item.status === "finished" ? "Encerrada" : "Em andamento"}</Typography>
              </Button>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
}
