import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { API_BASE_URL, fetchJson, postJson } from "./src/lib/api";
import { hasSupabaseMobileConfig, supabase } from "./src/lib/supabase";

type MobileMissionListItem = {
  slug: string;
  title: string;
  brand: string;
  points: number;
  difficulty: string;
  eta: string;
  category: string;
  imageUrl: string | null;
  minParticipants: number;
  currentParticipants: number;
};

type MobileMissionDetail = {
  slug: string;
  title: string;
  brand: string;
  product: string;
  points: number;
  difficulty: string;
  eta: string;
  category: string;
  description: string;
  hook: string;
  requirements: string[];
  deliverables: string[];
  tags: string[];
  imageUrl: string | null;
  minParticipants: number;
  currentParticipants: number;
};

type MobileMeResponse = {
  user: {
    id: string;
    email: string | null;
    fullName: string | null;
    instagramHandle: string | null;
    niche: string | null;
    followersRange: string | null;
    balance: number;
    approvedMissionCount: number;
  };
};

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<MobileMeResponse["user"] | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [missions, setMissions] = useState<MobileMissionListItem[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [selectedMission, setSelectedMission] = useState<MobileMissionDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedItem = useMemo(
    () => missions.find((item) => item.slug === selectedSlug) ?? null,
    [missions, selectedSlug],
  );

  const loadMissions = useCallback(async () => {
    setLoadingList(true);
    setError(null);

    try {
      const data = await fetchJson<{ missions: MobileMissionListItem[] }>("/api/mobile/missions");
      setMissions(data.missions);
      if (data.missions.length > 0) {
        setSelectedSlug(data.missions[0].slug);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load missions.");
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadMissionDetail = useCallback(async (slug: string) => {
    setLoadingDetail(true);
    setError(null);

    try {
      const data = await fetchJson<{ mission: MobileMissionDetail }>(`/api/mobile/missions/${slug}`);
      setSelectedMission(data.mission);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load mission detail.");
      setSelectedMission(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    void loadMissions();
  }, [loadMissions]);

  const loadProfile = useCallback(async (token: string) => {
    const data = await fetchJson<MobileMeResponse>("/api/mobile/me", token);
    setProfile(data.user);
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        return;
      }

      setAccessToken(session.access_token);
      try {
        await loadProfile(session.access_token);
      } catch {
        setProfile(null);
      }
    };

    void restoreSession();
  }, [loadProfile]);

  useEffect(() => {
    if (!selectedSlug) {
      return;
    }
    void loadMissionDetail(selectedSlug);
  }, [loadMissionDetail, selectedSlug]);

  const handleSignIn = useCallback(async () => {
    if (!hasSupabaseMobileConfig) {
      setError("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    if (!email.trim() || !password) {
      setError("Please enter email and password.");
      return;
    }

    setAuthBusy(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError || !data.session) {
        throw new Error(signInError?.message ?? "Unable to sign in.");
      }

      setAccessToken(data.session.access_token);

      // Keep parity with web session endpoint used by the existing backend.
      await postJson<{ ok: boolean }>("/api/auth/session", {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      await loadProfile(data.session.access_token);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Unable to sign in.");
      setProfile(null);
    } finally {
      setAuthBusy(false);
    }
  }, [email, loadProfile, password]);

  const handleSignOut = useCallback(async () => {
    setAuthBusy(true);
    setError(null);
    try {
      await supabase.auth.signOut();
      setAccessToken(null);
      setProfile(null);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Unable to sign out.");
    } finally {
      setAuthBusy(false);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Mission One Mobile</Text>
        <Text style={styles.subtitle}>Phase 5 preview: Auth + Missions list + detail from backend API</Text>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Auth</Text>
          {!hasSupabaseMobileConfig ? (
            <Text style={styles.error}>Missing mobile Supabase env setup.</Text>
          ) : null}

          {!accessToken ? (
            <View style={styles.authForm}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#64748b"
                secureTextEntry
                style={styles.input}
              />
              <Pressable onPress={handleSignIn} style={styles.primaryButton} disabled={authBusy || !hasSupabaseMobileConfig}>
                <Text style={styles.primaryButtonText}>{authBusy ? "Signing in..." : "Sign in"}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.authSummary}>
              <Text style={styles.missionTitle}>{profile?.fullName || profile?.email || "Signed in"}</Text>
              <Text style={styles.missionMeta}>Balance: {profile?.balance ?? 0} Coins</Text>
              <Text style={styles.missionMeta}>Approved missions: {profile?.approvedMissionCount ?? 0}</Text>
              <Pressable onPress={handleSignOut} style={styles.secondaryButton} disabled={authBusy}>
                <Text style={styles.secondaryButtonText}>{authBusy ? "Signing out..." : "Sign out"}</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Missions</Text>

          {loadingList ? <ActivityIndicator color="#22d3ee" /> : null}

          {!loadingList ? (
            <FlatList
              data={missions}
              keyExtractor={(item) => item.slug}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isActive = selectedItem?.slug === item.slug;
                return (
                  <Pressable
                    onPress={() => setSelectedSlug(item.slug)}
                    style={[styles.missionRow, isActive ? styles.missionRowActive : null]}
                  >
                    <Text style={styles.missionTitle}>{item.title}</Text>
                    <Text style={styles.missionMeta}>{item.brand} · {item.difficulty} · HK${item.points}</Text>
                  </Pressable>
                );
              }}
              ListEmptyComponent={<Text style={styles.hint}>No missions found.</Text>}
            />
          ) : null}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Mission Detail</Text>

          {loadingDetail ? <ActivityIndicator color="#22d3ee" /> : null}

          {!loadingDetail && selectedMission ? (
            <View style={styles.detailContent}>
              <Text style={styles.detailTitle}>{selectedMission.title}</Text>
              <Text style={styles.missionMeta}>{selectedMission.brand} · {selectedMission.category}</Text>
              <Text style={styles.detailDescription}>{selectedMission.description}</Text>
              <Text style={styles.hint}>Participants: {selectedMission.currentParticipants}/{selectedMission.minParticipants}</Text>
            </View>
          ) : null}

          {!loadingDetail && !selectedMission ? <Text style={styles.hint}>Select a mission to view details.</Text> : null}
        </View>

        {error ? <Text style={styles.error}>Error: {error}</Text> : null}

        <Text style={styles.footer}>API base URL: {API_BASE_URL}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#020617",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  title: {
    color: "#f8fafc",
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 13,
  },
  panel: {
    backgroundColor: "#0f172a",
    borderColor: "rgba(148, 163, 184, 0.25)",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    maxHeight: 280,
  },
  authForm: {
    gap: 8,
  },
  authSummary: {
    gap: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    backgroundColor: "#111827",
    color: "#f8fafc",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: "#22d3ee",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  primaryButtonText: {
    color: "#082f49",
    fontWeight: "700",
    fontSize: 14,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 6,
  },
  secondaryButtonText: {
    color: "#cbd5e1",
    fontWeight: "600",
    fontSize: 14,
  },
  panelTitle: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  listContent: {
    gap: 8,
  },
  missionRow: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    backgroundColor: "#111827",
    gap: 3,
  },
  missionRowActive: {
    borderColor: "#22d3ee",
    backgroundColor: "rgba(34, 211, 238, 0.12)",
  },
  missionTitle: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "600",
  },
  missionMeta: {
    color: "#94a3b8",
    fontSize: 12,
  },
  detailContent: {
    gap: 8,
  },
  detailTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "700",
  },
  detailDescription: {
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 20,
  },
  hint: {
    color: "#94a3b8",
    fontSize: 12,
  },
  error: {
    color: "#fca5a5",
    fontSize: 13,
  },
  footer: {
    color: "#64748b",
    fontSize: 11,
  },
});
