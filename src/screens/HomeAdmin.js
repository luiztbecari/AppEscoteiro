import React, { useState, useCallback, useContext, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native'; 
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext } from '../context/ThemeContext';

const VERDE_ESCURO = '#1A4524';
const OURO_DETALHE = '#DAA520';

export default function HomeAdmin({ navigation, route }) {
  const { colors } = useContext(ThemeContext);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const adminLogado = route.params?.user || route.params?.params?.user;
  
  const [loading, setLoading] = useState(true);
  const [dadosAdmin, setDadosAdmin] = useState({ name: "Luis", role: "Presidente" });
  const [chefes, setChefes] = useState([]);
  const [ramos, setRamos] = useState([]);
  const [ramoSelecionado, setRamoSelecionado] = useState(null);
  const [loadingChefes, setLoadingChefes] = useState(false);

  const BASE_URL = 'https://grupo-escoteiro.onrender.com';

  const carregarDadosIniciais = async () => {
    try {
      setLoading(true);
      let nomeFinal = adminLogado?.name || adminLogado?.nome;
      let cargoFinal = adminLogado?.role || adminLogado?.global_role || adminLogado?.cargo;
      let emailFinal = adminLogado?.email;
      if (!nomeFinal && emailFinal) nomeFinal = emailFinal.split('@')[0];
      const roleNormalizada = cargoFinal === "admin" || cargoFinal === "Administrador" ? "Presidente" : (cargoFinal || "Presidente");
      setDadosAdmin({ name: nomeFinal || "Luis", role: roleNormalizada });
    } catch (err) {
      console.log("Erro dados admin:", err);
    } finally {
      setLoading(false);
    }
  };

  const carregarFiltrosERamos = async (token) => {
    try {
      const res = await fetch(`${BASE_URL}/branches`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setRamos(await res.json());
    } catch (err) { console.log("Erro ramos:", err); }
  };

  const carregarChefes = async () => {
    try {
      setLoadingChefes(true);
      const token = await AsyncStorage.getItem('@token_chefe');
      await carregarFiltrosERamos(token);

      const res = await fetch(`${BASE_URL}/users`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const dados = await res.json();
        setChefes(dados.filter(u => {
          const r = (u.global_role || u.role || '').toLowerCase();
          return r.includes('chefe') || r.includes('leader') || r.includes('seção');
        }));
      }
    } catch (err) { console.log("Erro chefes:", err); } 
    finally { setLoadingChefes(false); }
  };

  useFocusEffect(useCallback(() => { 
    carregarDadosIniciais(); 
    carregarChefes(); 
  }, [route.params]));

  const chefesFiltrados = chefes.filter(chefe => {
    if (ramoSelecionado === null) return true;
    return (chefe.branch_name || '').toLowerCase().trim() === (ramoSelecionado.name || ramoSelecionado.nome || '').toLowerCase().trim();
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.cardPerfil}>
        <View style={styles.avatarCircular}><Ionicons name="person" size={40} color={VERDE_ESCURO} /></View>
        <View style={{ marginLeft: 15, flex: 1 }}>
          <Text style={styles.nomeUser}>{dadosAdmin.name}</Text>
          <Text style={styles.subtitulo}>{dadosAdmin.role} • Sempre Alerta!</Text>
        </View>
        <Ionicons name="shield-checkmark" size={30} color={OURO_DETALHE} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Painel Administrativo</Text>
        {loading ? <ActivityIndicator color={colors.primary} size="large" /> : (
          <>
            <TouchableOpacity style={styles.mainAdminButton} onPress={() => navigation.navigate('CreateLeader', { user: adminLogado })}>
              <View style={styles.mainButtonContent}>
                <View style={styles.mainIconBox}><Ionicons name="person-add" size={28} color="#FFF" /></View>
                <View style={{ flex: 1, marginLeft: 15 }}>
                  <Text style={styles.mainButtonText}>Cadastrar Novo Chefe</Text>
                  <Text style={styles.mainButtonSubtext}>Criar acessos e ramos de atuação</Text>
                </View>
              </View>
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, { marginTop: 25, marginBottom: 10 }]}>Chefes de Seção</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtroContainer}>
              <TouchableOpacity style={[styles.botaoFiltro, ramoSelecionado === null && styles.botaoFiltroAtivo]} onPress={() => setRamoSelecionado(null)}>
                <Text style={[styles.textoFiltro, ramoSelecionado === null && styles.textoFiltroAtivo]}>Todos</Text>
              </TouchableOpacity>
              {ramos.map(r => (
                <TouchableOpacity key={r.id} style={[styles.botaoFiltro, ramoSelecionado?.id === r.id && styles.botaoFiltroAtivo]} onPress={() => setRamoSelecionado(r)}>
                  <Text style={[styles.textoFiltro, ramoSelecionado?.id === r.id && styles.textoFiltroAtivo]}>{r.name || r.nome}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {loadingChefes ? <ActivityIndicator color={colors.primary} size="small" /> : (
              chefesFiltrados.map((chefe) => (
                <TouchableOpacity 
                  key={chefe.id} 
                  style={styles.cardChefe} 
                  onPress={() => navigation.navigate('ProfileAdmin', { chefeId: chefe.id, chefeNome: chefe.name || chefe.nome })}
                >
                  <View style={styles.avatarChefeMini}><Ionicons name="person" size={20} color={colors.primary} /></View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.nomeChefeLista}>{chefe.name || chefe.nome}</Text>
                    <Text style={styles.ramoChefeLista}>{chefe.branch_name || "Ramo não associado"}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.border} />
                </TouchableOpacity>
              ))
            )}
            {!loadingChefes && chefesFiltrados.length === 0 && <Text style={styles.textoVazio}>Nenhum chefe ativo neste ramo.</Text>}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: colors.background },
  cardPerfil: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 15, backgroundColor: VERDE_ESCURO, elevation: 5, marginTop: 10 },
  avatarCircular: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  nomeUser: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  subtitulo: { color: OURO_DETALHE, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: colors.primary, marginBottom: 15 },
  mainAdminButton: { backgroundColor: colors.card, borderRadius: 16, padding: 20, elevation: 4, marginBottom: 12, borderLeftWidth: 6, borderLeftColor: colors.primary },
  mainButtonContent: { flexDirection: 'row', alignItems: 'center' },
  mainIconBox: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary },
  mainButtonText: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
  mainButtonSubtext: { fontSize: 12, color: colors.text, opacity: 0.6 },
  filtroContainer: { flexDirection: 'row', marginBottom: 15 },
  botaoFiltro: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.card, marginRight: 8, height: 38 },
  botaoFiltroAtivo: { backgroundColor: colors.primary },
  textoFiltro: { color: colors.text, opacity: 0.7, fontWeight: '600' },
  textoFiltroAtivo: { color: '#FFF', opacity: 1 },
  cardChefe: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 15, borderRadius: 12, marginBottom: 8, elevation: 1 },
  avatarChefeMini: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
  nomeChefeLista: { fontSize: 15, fontWeight: 'bold', color: colors.text },
  ramoChefeLista: { fontSize: 12, color: colors.text, opacity: 0.6 },
  textoVazio: { textAlign: 'center', color: colors.text, opacity: 0.5, marginTop: 20 }
});