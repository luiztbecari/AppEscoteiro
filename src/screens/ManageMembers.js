import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, TextInput, ScrollView, StyleSheet } from 'react-native';
import { useState, useContext, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';
import { styles as globalStyles } from '../styles/styles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const VERDE_SKILL = '#2E8B57';

const calcularIdadeApartirDeData = (dataNascimento) => {
  if (!dataNascimento) return '--';

  try {
    const dataNasc = new Date(dataNascimento);
    if (isNaN(dataNasc.getTime())) return '--';

    const hoje = new Date();
    let idadeCalculada = hoje.getFullYear() - dataNasc.getFullYear();
    const diferencaMeses = hoje.getMonth() - dataNasc.getMonth();

    if (diferencaMeses < 0 || (diferencaMeses === 0 && hoje.getDate() < dataNasc.getDate())) {
      idadeCalculada--;
    }

    return idadeCalculada >= 0 ? idadeCalculada : '--';
  } catch (error) {
    console.error("Erro ao converter data de nascimento:", error);
    return '--';
  }
};

// Diz se o jovem pertence ao ramo escolhido no filtro (por id ou pelo nome do ramo)
const pertenceAoRamo = (jovem, ramo) => {
  if (jovem.branch_id && String(jovem.branch_id).trim() === String(ramo.id)) return true;

  const nomeRamo = (ramo.name || ramo.nome || '').toLowerCase().trim();
  const nomeDoJovem = (jovem.branch_name || jovem.ramo || '').toLowerCase().trim();
  return nomeDoJovem !== '' && (nomeDoJovem === nomeRamo || nomeDoJovem === `ramo ${nomeRamo}`);
};

export default function ManageMembers({ navigation, route }) {
  const { colors } = useContext(ThemeContext);
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Filtro por ramo (só aparece para presidente/admin)
  const [ehAdmin, setEhAdmin] = useState(false);
  const [ramos, setRamos] = useState([]);
  const [ramoSelecionado, setRamoSelecionado] = useState(null);

  const BASE_URL = 'https://grupo-escoteiro-ia-gefi-docker-teste.onrender.com';

  const carregarMembros = async () => {
    try {
      setLoading(true);
      const tokenChefe = await AsyncStorage.getItem('@token_chefe');

      let cargoUsuario = route.params?.user?.role || route.params?.user?.global_role;
      if (!cargoUsuario) {
        cargoUsuario = await AsyncStorage.getItem('@user_role');
      }

      const cargoNormalizado = cargoUsuario ? cargoUsuario.toLowerCase().trim() : '';
      const admin = cargoNormalizado === 'admin' || cargoNormalizado === 'administrador' || cargoNormalizado === 'presidente';
      setEhAdmin(admin);

      const response = await fetch(`${BASE_URL}/members`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenChefe}`
        }
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      const listaCompleta = Array.isArray(data) ? data : (data.members || data.data || []);

      if (admin) {
        // Presidente vê todos os membros e pode filtrar pelo ramo
        try {
          const ramosRes = await fetch(`${BASE_URL}/branches`, {
            headers: { 'Authorization': `Bearer ${tokenChefe}` }
          });
          if (ramosRes.ok) setRamos(await ramosRes.json());
        } catch (err) {
          console.log("Erro ao carregar ramos:", err);
        }

        setMembers(listaCompleta);
      } else {
        const storageBranchId = await AsyncStorage.getItem('@branch_id');

        if (storageBranchId !== undefined && storageBranchId !== null) {
          const branchIdStr = storageBranchId.toString().trim();

          let nomeDoRamoAlvo = "";
          if (branchIdStr === "1") nomeDoRamoAlvo = "Escoteiro";
          if (branchIdStr === "2") nomeDoRamoAlvo = "Lobinho";
          if (branchIdStr === "3") nomeDoRamoAlvo = "Sênior";
          if (branchIdStr === "4") nomeDoRamoAlvo = "Pioneiro";

          const listaFiltrada = listaCompleta.filter(jovem => {
            if (jovem.branch_id && jovem.branch_id.toString().trim() === branchIdStr) {
              return true;
            }

            if (jovem.branch_name && nomeDoRamoAlvo) {
              const bName = jovem.branch_name.toLowerCase().trim();
              const targetName = nomeDoRamoAlvo.toLowerCase().trim();
              return bName === targetName || bName === `ramo ${targetName}`;
            }

            if (jovem.ramo && nomeDoRamoAlvo) {
              return jovem.ramo.toLowerCase().trim() === nomeDoRamoAlvo.toLowerCase().trim();
            }

            return false;
          });

          setMembers(listaFiltrada);
        } else {
          setMembers(listaCompleta);
        }
      }

    } catch (error) {
      console.error("Erro ao carregar membros:", error);
      Alert.alert("Erro", "Não foi possível carregar os membros do servidor.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      carregarMembros();
    }, [route.params])
  );

  const filteredMembers = members.filter(m => {
    const nomeMembro = m.nome || m.name || '';
    const passaNaBusca = nomeMembro.toLowerCase().includes(search.toLowerCase());
    const passaNoRamo = ramoSelecionado === null || pertenceAoRamo(m, ramoSelecionado);
    return passaNaBusca && passaNoRamo;
  });

  const renderSkillsRow = (item) => {
    const fis = item.skill_fisico ?? '--';
    const tec = item.skill_tecnico ?? '--';
    const exp = item.skill_experiencia ?? '--';

    const pillStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 12,
      marginBottom: 4,
    };

    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
        <View style={pillStyle}>
          <Ionicons name="fitness" size={11} color={VERDE_SKILL} style={{ marginRight: 2 }} />
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>
            Fís: <Text style={{ fontWeight: 'bold', color: VERDE_SKILL }}>{fis}</Text>
          </Text>
        </View>

        <View style={pillStyle}>
          <Ionicons name="build" size={11} color={VERDE_SKILL} style={{ marginRight: 2 }} />
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>
            Téc: <Text style={{ fontWeight: 'bold', color: VERDE_SKILL }}>{tec}</Text>
          </Text>
        </View>

        <View style={pillStyle}>
          <Ionicons name="ribbon" size={11} color={VERDE_SKILL} style={{ marginRight: 2 }} />
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>
            Exp: <Text style={{ fontWeight: 'bold', color: VERDE_SKILL }}>{exp}</Text>
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 20 }}>

      <Text style={[globalStyles.title, { color: colors.primary, alignSelf: 'flex-start', marginBottom: 15, fontSize: 24, fontWeight: 'bold' }]}>
        Gerenciar Membros
      </Text>

      <TextInput
        style={{
          backgroundColor: colors.card,
          color: colors.text,
          padding: 12,
          borderRadius: 10,
          marginBottom: 15,
          borderWidth: 1,
          borderColor: colors.primary + '30',
          elevation: 2
        }}
        placeholder="Buscar membro por nome..."
        placeholderTextColor={colors.text + '80'}
        value={search}
        onChangeText={setSearch}
      />

      {/* Filtro por ramo: só o presidente/admin enxerga */}
      {ehAdmin && (
        <View style={styles.filtroContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtroConteudo}>
          <TouchableOpacity
            style={[styles.botaoFiltro, { backgroundColor: ramoSelecionado === null ? colors.primary : colors.card }]}
            onPress={() => setRamoSelecionado(null)}
          >
            <Text style={[styles.textoFiltro, { color: ramoSelecionado === null ? '#FFF' : colors.text, opacity: ramoSelecionado === null ? 1 : 0.7 }]}>Todos</Text>
          </TouchableOpacity>

          {ramos.map(r => {
            const ativo = ramoSelecionado?.id === r.id;
            return (
              <TouchableOpacity
                key={r.id}
                style={[styles.botaoFiltro, { backgroundColor: ativo ? colors.primary : colors.card }]}
                onPress={() => setRamoSelecionado(r)}
              >
                <Text style={[styles.textoFiltro, { color: ativo ? '#FFF' : colors.text, opacity: ativo ? 1 : 0.7 }]}>{r.name || r.nome}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        </View>
      )}

      <TouchableOpacity
        style={[globalStyles.button, { backgroundColor: colors.primary, marginBottom: 20, width: '100%', height: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 10 }]}
        onPress={() => navigation.navigate('CreateMember', { user: route.params?.user })}
      >
        <Text style={[globalStyles.buttonText, { color: '#FFF', fontWeight: 'bold' }]}>+ Novo Membro</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredMembers}
          keyExtractor={(item) => (item._id || item.id || Math.random()).toString()}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const idadeCalculada = calcularIdadeApartirDeData(item.date_of_birth);
            const stringIdade = idadeCalculada !== '--' ? `${idadeCalculada} anos` : 'Idade antiga';

            return (
              <View style={{
                backgroundColor: colors.card,
                padding: 15,
                borderRadius: 12,
                marginBottom: 15,
                borderLeftWidth: 6,
                borderLeftColor: colors.primary,
                elevation: 3,
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.text, marginRight: 8 }}>
                        {item.nome || item.name}
                      </Text>
                      <Text style={{ fontSize: 13, color: colors.border, fontWeight: '600' }}>
                        • {stringIdade}
                      </Text>
                    </View>

                    <Text style={{ color: colors.text, opacity: 0.6, marginTop: 4, fontSize: 13 }}>
                      {item.branch_name || item.ramo || `Ramo ID: ${item.branch_id || 'Não Definido'}`}
                      {item.patrol_name ? ` • Patrulha ${item.patrol_name}` : ''}
                    </Text>

                    {renderSkillsRow(item)}
                  </View>

                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.primary + '15',
                      paddingVertical: 8,
                      paddingHorizontal: 15,
                      borderRadius: 8,
                      alignSelf: 'center'
                    }}
                    onPress={() => navigation.navigate('EditMemberSkills', {
                      member: item,
                      user: route.params?.user
                    })}
                  >
                    <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Editar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 50 }}>
              <Text style={{ color: colors.text, opacity: 0.5 }}>Nenhum jovem encontrado para este ramo.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // altura fixa: sem ela o filtro horizontal é espremido pela lista e os botões ficam cortados
  filtroContainer: { height: 38, marginBottom: 15 },
  filtroConteudo: { alignItems: 'center' },
  botaoFiltro: { paddingHorizontal: 16, borderRadius: 20, marginRight: 8, height: 38, justifyContent: 'center' },
  textoFiltro: { fontWeight: '600' }
});