import React, { useState, useCallback, useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext } from '../context/ThemeContext';
import { styles as globalStyles } from '../styles/styles';

export default function HomeChefe({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const route = useRoute();
  const [patrulhas, setPatrulhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ramoIdDetectado, setRamoIdDetectado] = useState(null);
  const [nomeDoRamo, setNomeDoRamo] = useState("Carregando Ramo...");
  const [todosOsRamos, setTodosOsRamos] = useState([]);

  const state = navigation.getParent()?.getState();
  const routeParams = state?.routes?.find(r => r.name === 'HomeResponsavel' || r.name === 'HomeAdmin' || r.name === 'HomeChefe')?.params;
  const chefeLogado = routeParams?.params?.user || routeParams?.user || route.params?.user || {};

  const BASE_URL = 'https://grupo-escoteiro-ia-gefi-docker-teste.onrender.com';

  const carregarDados = async () => {
    try {
      setLoading(true);
      const tokenUsuario = await AsyncStorage.getItem('@token_chefe');

      let branchIdEfetivo = chefeLogado?.branch_id || chefeLogado?.user?.branch_id || chefeLogado?.id_ramo;
      if (!branchIdEfetivo) {
        const branchSalvo = await AsyncStorage.getItem('@branch_id');
        branchIdEfetivo = branchSalvo ? parseInt(branchSalvo, 10) : 1;
      }
      const idFinal = parseInt(branchIdEfetivo, 10);
      setRamoIdDetectado(idFinal);

      const ramosRes = await fetch(`${BASE_URL}/branches`, {
        headers: { 'Authorization': `Bearer ${tokenUsuario}` }
      });

      if (ramosRes.ok) {
        const dadosRamos = await ramosRes.json();
        setTodosOsRamos(dadosRamos);
        const meuRamo = dadosRamos.find(r => parseInt(r.id, 10) === idFinal);
        setNomeDoRamo(meuRamo ? (meuRamo.name || meuRamo.nome) : `Ramo ID ${idFinal}`);
      }

      const res = await fetch(`${BASE_URL}/patrols/branch/${idFinal}`, {
        headers: { 'Authorization': `Bearer ${tokenUsuario}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPatrulhas(Array.isArray(data) ? data : (data.patrols || data.data || []));
      }

    } catch (err) {
      console.log("ERRO AO CARREGAR DADOS:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    carregarDados();
  }, []));

  const dadosExibicao = {
    name: chefeLogado?.name || chefeLogado?.nome || chefeLogado?.user?.name || chefeLogado?.user?.nome || 'Chefe',
    role: chefeLogado?.role || chefeLogado?.global_role || chefeLogado?.user?.role || 'Chefe'
  };

  const obterNomeDoRamoPorId = (idInput) => {
    const ramoAchado = todosOsRamos.find(r => parseInt(r.id, 10) === parseInt(idInput, 10));
    return ramoAchado ? (ramoAchado.name || ramoAchado.nome) : `Ramo ID ${idInput}`;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.linha}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color={colors.primary} />
          </View>
          <View style={{ flex: 1, paddingHorizontal: 12 }}>
            <Text style={styles.nome}>{dadosExibicao.name}</Text>
            <Text style={styles.subtitulo}>{dadosExibicao.role} • {nomeDoRamo}</Text>
          </View>
          <Ionicons name="shield-checkmark" size={26} color={colors.primary} />
        </View>
      </View>

      <Text style={[globalStyles.title, { color: colors.primary, alignSelf: 'flex-start', marginBottom: 15, fontSize: 24, fontWeight: 'bold' }]}>
        Patrulhas da Seção
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : patrulhas.length > 0 ? (
        patrulhas.map((item) => (
          <View key={item.id || item._id} style={styles.card}>
            <View style={styles.linha}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.nome}>{item.name || item.nome}</Text>
                <View style={styles.badgeRamo}>
                  <Text style={styles.badgeRamoTexto}>
                    {obterNomeDoRamoPorId(item.branch_id || ramoIdDetectado)}
                  </Text>
                </View>
              </View>
              <View style={styles.badgeMembros}>
                <Ionicons name="people" size={16} color={colors.primary} />
                <Text style={styles.badgeMembrosTexto}> {item.membros?.length || 0} ativos</Text>
              </View>
            </View>
          </View>
        ))
      ) : (
        <View style={{ alignItems: 'center', marginTop: 50 }}>
          <Text style={{ color: colors.text, opacity: 0.5 }}>Nenhuma patrulha encontrada.</Text>
        </View>
      )}

      <View style={{ height: 35 }} />
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20 },

  card: {
    backgroundColor: colors.card,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderLeftWidth: 6,
    borderLeftColor: colors.primary,
    elevation: 3
  },
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center'
  },
  nome: { fontSize: 17, fontWeight: 'bold', color: colors.text },
  subtitulo: { color: colors.text, opacity: 0.6, marginTop: 4, fontSize: 13, textTransform: 'capitalize' },

  badgeRamo: { backgroundColor: colors.primary + '20', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 6 },
  badgeRamoTexto: { color: colors.primary, fontSize: 11, fontWeight: 'bold' },

  badgeMembros: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '15', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8 },
  badgeMembrosTexto: { color: colors.primary, fontWeight: 'bold' }
});