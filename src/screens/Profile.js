import React, { useContext, useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext, PREFIXO_TEMA } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Profile() {
  const { colors, isDark, toggleTheme, usuarioId: usuarioIdTema, carregarTemaDoUsuario, resetarTema } = useContext(ThemeContext);
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [ramoNome, setRamoNome] = useState("Não Informado");
  const [cargoExibido, setCargoExibido] = useState("Chefe");

  const BASE_URL = 'https://grupo-escoteiro-ia-gefi-docker-teste.onrender.com';

  const state = navigation.getParent()?.getState();
  const routeParams = state?.routes?.find(r => r.name === 'HomeResponsavel' || r.name === 'HomeAdmin' || r.name === 'HomeChefe')?.params;
  const chefeLogadoNav = routeParams?.params?.user || routeParams?.user || {};

  const userIdPerfil = chefeLogadoNav?.id || chefeLogadoNav?.user?.id;

  // Garantia: se o tema ainda não foi vinculado a esta conta (ex.: no login), vincula agora
  useEffect(() => {
    if (userIdPerfil && String(userIdPerfil) !== usuarioIdTema) {
      carregarTemaDoUsuario(userIdPerfil);
    }
  }, [userIdPerfil]);

  useEffect(() => {
    const carregarDadosPerfil = async () => {
      try {
        setLoading(true);
        const tokenChefe = await AsyncStorage.getItem('@token_chefe');
        
        const userId = chefeLogadoNav?.id || chefeLogadoNav?.user?.id;

        let branchIdEncontrado = null;
        const localBranchId = await AsyncStorage.getItem('@branch_id');

        if (localBranchId) {
          branchIdEncontrado = parseInt(localBranchId, 10);
        } else if (chefeLogadoNav?.branch_id || chefeLogadoNav?.id_ramo) {
          branchIdEncontrado = parseInt(chefeLogadoNav.branch_id || chefeLogadoNav.id_ramo, 10);
        }

        if (branchIdEncontrado) {
          try {
            const response = await fetch(`${BASE_URL}/branches`, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${tokenChefe}`
              }
            });

            if (response.ok) {
              const ramosDoBanco = await response.json();
              const ramoCorrespondente = ramosDoBanco.find(r => r.id === branchIdEncontrado);
              
              if (ramoCorrespondente) {
                setRamoNome(ramoCorrespondente.name || ramoCorrespondente.nome);
              } else {
                setRamoNome(`Ramo ID ${branchIdEncontrado}`);
              }
            } else {
              setRamoNome(`Ramo ID ${branchIdEncontrado}`);
            }
          } catch (apiErr) {
            console.log("Erro de rede ao buscar ramos no perfil:", apiErr);
            setRamoNome(`Ramo ID ${branchIdEncontrado}`);
          }
        } else {
          setRamoNome("Ramo não associado");
        }

        let cargoVerificado = null;

        if (userId) {
          try {
            const userResponse = await fetch(`${BASE_URL}/users/${userId}`, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${tokenChefe}`
              }
            });

            if (userResponse.ok) {
              const userData = await userResponse.json();
              cargoVerificado = userData.role || userData.global_role || userData.cargo;
            }
          } catch (userApiErr) {
            console.log("Erro de rede ao buscar cargo do usuário, tentando fallbacks:", userApiErr);
          }
        }

        if (!cargoVerificado) {
          cargoVerificado = chefeLogadoNav.role || chefeLogadoNav.global_role || chefeLogadoNav.cargo;
        }
        if (!cargoVerificado) {
          cargoVerificado = await AsyncStorage.getItem('@user_role');
        }

        console.log("🔍 [PERFIL VIVO] Cargo definitivo do banco:", cargoVerificado);

        if (cargoVerificado) {
          const cargoLimpo = cargoVerificado.trim().toLowerCase();
          
          if (cargoLimpo === 'admin' || cargoLimpo === 'administrador' || cargoLimpo === 'presidente') {
            setCargoExibido("Presidente");
          } else if (cargoLimpo === 'financeiro') {
            setCargoExibido("Financeiro");
          } else {
            setCargoExibido(cargoVerificado.trim().charAt(0).toUpperCase() + cargoVerificado.trim().slice(1).toLowerCase());
          }
        } else {
          setCargoExibido("Chefe de Seção");
        }

      } catch (err) {
        console.log("Erro ao carregar dados no Perfil:", err);
        setRamoNome("Erro ao carregar");
        setCargoExibido("Erro ao carregar");
      } finally {
        setLoading(false);
      }
    };

    carregarDadosPerfil();
  }, []);

  const handleLogout = async () => {
    // O clear() apaga tudo do AsyncStorage, inclusive as preferências de tema de cada conta.
    // Guardamos as chaves de tema antes e restauramos depois, para cada conta
    // manter o seu modo escuro na próxima vez que entrar.
    const todasChaves = await AsyncStorage.getAllKeys();
    const chavesTema = todasChaves.filter(k => k.startsWith(PREFIXO_TEMA));
    const temasSalvos = chavesTema.length > 0 ? await AsyncStorage.multiGet(chavesTema) : [];

    await AsyncStorage.clear();

    if (temasSalvos.length > 0) {
      await AsyncStorage.multiSet(temasSalvos);
    }

    // Volta para o tema claro (a próxima conta carrega o seu próprio tema no login)
    resetarTema();

    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 20, alignItems: 'center' }}>
        
        <View style={styles.avatarContainer}>
          <Image
            source={require('../../assets/perfil.png')} 
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              borderWidth: 3,
              borderColor: colors.primary
            }}
          />
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
             <Ionicons name="shield-checkmark" size={20} color="#FFF" />
          </View>
        </View>

        <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text, marginTop: 10, textAlign: 'center' }}>
          {chefeLogadoNav.name || chefeLogadoNav.nome || "Chefe de Seção"}
        </Text>

        <Text style={{ fontSize: 16, color: colors.text, opacity: 0.6, marginBottom: 25, textAlign: 'center' }}>
          {chefeLogadoNav.email || "chefe@escoteiros.org"}
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          
          <View style={styles.item}>
            <View style={styles.leftInfo}>
              <Ionicons name="briefcase-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
              <Text style={[styles.text, { color: colors.text }]}>Cargo</Text>
            </View>
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={{ color: colors.primary, fontWeight: 'bold' }}>
                {cargoExibido}
              </Text>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.text + '20' }]} />

          <View style={styles.item}>
            <View style={styles.leftInfo}>
              <Ionicons name="leaf-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
              <Text style={[styles.text, { color: colors.text }]}>Ramo</Text>
            </View>
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={{ color: colors.text, fontWeight: '600' }}>
                {ramoNome}
              </Text>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.text + '20' }]} />

          <View style={styles.item}>
            <View style={styles.leftInfo}>
              <Ionicons name="business-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
              <Text style={[styles.text, { color: colors.text }]}>Grupo</Text>
            </View>
            <Text style={{ color: colors.text }}>
              {chefeLogadoNav.grupo || "Escoteiros do Brasil"}
            </Text>
          </View>

        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.item}>
            <View style={styles.leftInfo}>
              <Ionicons
                name={isDark ? 'moon' : 'moon-outline'}
                size={20}
                color={colors.primary}
                style={{ marginRight: 10 }}
              />
              <Text style={[styles.text, { color: colors.text }]}>Modo escuro</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={isDark ? colors.primary : '#F4F3F4'}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={22} color="#FF3B30" style={{ marginRight: 10 }} />
          <Text style={styles.logoutButtonText}>Desconectar-se</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatarContainer: { position: 'relative', marginBottom: 15 },
  badge: { position: 'absolute', bottom: 5, right: 5, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  card: { width: '100%', borderRadius: 15, marginBottom: 25, overflow: 'hidden', elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  item: { padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  leftInfo: { flexDirection: 'row', alignItems: 'center' },
  text: { fontSize: 16 },
  divider: { height: 1, marginHorizontal: 15 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', padding: 16, borderRadius: 15, borderWidth: 1.5, borderColor: '#FF3B30', marginTop: 10, backgroundColor: 'transparent' },
  logoutButtonText: { color: '#FF3B30', fontSize: 16, fontWeight: 'bold' }
});