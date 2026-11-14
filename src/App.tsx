import { useEffect, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, Chip, Container, Divider,
  IconButton, List, ListItem, ListItemText, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SportsEsportsRoundedIcon from "@mui/icons-material/SportsEsportsRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import { reduceScore, type TeamId } from "./domain/game";
import { calculateTeamStatistics } from "./domain/statistics";
import {
  createNewGame, getActiveGame, listAllGames, listGameEvents, listRecentGames,
  saveGameAndEvents, selectGame, type LocalGame
} from "./infrastructure/database";

export default function App() {
  const [game, setGame] = useState<LocalGame | null>(null);
  const [history, setHistory] = useState<LocalGame[]>([]);
  const [gameEvents, setGameEvents] = useState<Awaited<ReturnType<typeof listGameEvents>>>([]);
  const [teamStatistics, setTeamStatistics] = useState<ReturnType<typeof calculateTeamStatistics>>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [teamAName, setTeamAName] = useState("Dupla 1");
  const [teamBName, setTeamBName] = useState("Dupla 2");

  async function refreshHistory() {
    const [recentGames, allGames] = await Promise.all([listRecentGames(20), listAllGames()]);
    setHistory(recentGames);
    setTeamStatistics(calculateTeamStatistics(allGames.map((item) => ({
      teamAName: item.teamAName,
      teamBName: item.teamBName,
      teamAScore: item.score.teamA,
      teamBScore: item.score.teamB,
      finished: item.score.finished,
      winner: item.score.winner
    }))));
  }

  async function refreshGameEvents(gameId: string) {
    setGameEvents(await listGameEvents(gameId));
  }

  useEffect(() => {
    let active = true;
    getActiveGame()
      .then(async (current) => {
        if (!active) return;
        setGame(current);
        setTeamAName(current.teamAName);
        setTeamBName(current.teamBName);
        await Promise.all([refreshHistory(), refreshGameEvents(current.id)]);
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
      await Promise.all([refreshHistory(), refreshGameEvents(updated.id)]);
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
    try {
      const next = await createNewGame(game, targetScore ?? game.score.targetScore);
      setGame(next);
      setTeamAName(next.teamAName);
      setTeamBName(next.teamBName);
      setStorageError("");
      await Promise.all([refreshHistory(), refreshGameEvents(next.id)]);
    } catch {
      setStorageError("Não foi possível criar a nova partida. A partida atual foi preservada.");
    }
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
    try {
      const selected = await selectGame(gameId);
      if (!selected) return;
      setGame(selected);
      setTeamAName(selected.teamAName);
      setTeamBName(selected.teamBName);
      setStorageError("");
      await refreshGameEvents(selected.id);
    } catch {
      setStorageError("Não foi possível abrir a partida selecionada.");
    }
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
              <Divider />
              <Typography fontWeight={700}>Jogadores da partida</Typography>
              <Typography variant="caption" color="text.secondary">
                {game.variant.playersPerTeam} jogador(es) por equipe • os assentos seguem a configuração da variante.
              </Typography>
              {(["team-a", "team-b"] as const).map((teamId) => (
                <Box key={teamId}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    {teamId === "team-a" ? teamAName || "Dupla 1" : teamBName || "Dupla 2"}
                  </Typography>
                  <Stack spacing={1}>
                    {game.players.filter((player) => player.teamId === teamId).sort((a, b) => a.seat - b.seat).map((player) => (
                      <TextField
                        key={player.playerId}
                        label={`Jogador ${player.seat}`}
                        value={player.name}
                        onChange={(event) => {
                          const players = game.players.map((item) =>
                            item.playerId === player.playerId ? { ...item, name: event.target.value } : item
                          );
                          setGame({ ...game, players });
                        }}
                        size="small"
                        inputProps={{ maxLength: 40 }}
                        fullWidth
                        disabled={saving || !ready}
                      />
                    ))}
                  </Stack>
                </Box>
              ))}
              <Button
                variant="outlined"
                onClick={() => void persistGame({ ...game, updatedAt: new Date().toISOString() })}
                disabled={!ready || saving || game.players.some((player) => player.name.trim().length > 40)}
              >
                Salvar jogadores
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
          <Typography fontWeight={700} sx={{ mb: 1 }}>Estatísticas das duplas</Typography>
          {teamStatistics.length === 0 && <Typography color="text.secondary" variant="body2">As estatísticas aparecerão após a primeira partida encerrada.</Typography>}
          <Stack spacing={1}>
            {teamStatistics.map((team) => (
              <Card key={team.teamName} variant="outlined">
                <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Typography fontWeight={700}>{team.teamName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {team.wins} vitórias • {team.losses} derrotas • {team.draws} empates
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {team.gamesPlayed} partidas • aproveitamento {team.winRate.toFixed(1)}% • pontos {team.pointsFor} a favor / {team.pointsAgainst} contra
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>

        <Divider />
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <HistoryRoundedIcon color="action" />
            <Typography fontWeight={700}>Eventos desta partida</Typography>
            <Chip size="small" label={gameEvents.length} />
          </Stack>
          {gameEvents.length === 0 && <Typography color="text.secondary" variant="body2">Nenhum evento registrado.</Typography>}
          <List dense disablePadding>
            {gameEvents.slice(-10).reverse().map((event) => (
              <ListItem key={event.eventId} divider alignItems="flex-start">
                <ListItemText
                  primary={event.type === "GAME_STARTED" ? "Partida iniciada" : event.type === "GAME_FINISHED" ? "Partida encerrada" : event.type === "GAME_RESET" ? "Placar reiniciado" : event.teamId === "team-a" ? "Pontuação de " + game.teamAName + " atualizada" : "Pontuação de " + game.teamBName + " atualizada"}
                  secondary={new Date(event.occurredAt).toLocaleString("pt-BR") + " • " + event.score.teamA + " × " + event.score.teamB + " • sequência " + event.sequence}
                />
              </ListItem>
            ))}
          </List>
          {gameEvents.length > 10 && <Typography variant="caption" color="text.secondary">Exibindo os 10 eventos mais recentes de {gameEvents.length}.</Typography>}
        </Box>

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
