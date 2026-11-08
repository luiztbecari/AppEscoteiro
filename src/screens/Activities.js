import React, { useState, useContext, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  StyleSheet
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext } from '../context/ThemeContext';
import { styles as globalStyles } from '../styles/styles';

const OURO_DETALHE = '#DAA520';
const BASE_URL = 'https://grupo-escoteiro.onrender.com';

// A API pode devolver os campos com outros nomes; tentamos os mais comuns
const obterNome = (item) => {
  const conhecido =
    item.name || item.nome || item.title || item.titulo ||
    item.activity_name || item.nome_atividade || item.atividade;
  if (conhecido) return String(conhecido);

  // Última tentativa: qualquer campo com name/nome/title/titulo no nome (ex.: activity_title)
  const chave = Object.keys(item).find(k =>
    /(name|nome|title|titulo)/i.test(k) &&
    !/(user|branch|created|updated|patrol|member|ramo)/i.test(k) &&
    typeof item[k] === 'string' && item[k].trim() !== ''
  );
  return chave ? item[chave] : '';
};

const obterDescricao = (item) =>
  item.description || item.descricao || item.desc || item.details || '';

const obterData = (item) =>
  String(item.activity_date || item.date || item.data || item.data_atividade || item.event_date || '').slice(0, 10);

// Mostra AAAA-MM-DD como DD/MM/AAAA sem passar por Date (evita erro de fuso horário)
const formatarDataExibicao = (valor) => {
  if (!valor) return '';
  const [ano, mes, dia] = String(valor).slice(0, 10).split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : '';
};

const hojeISO = () => {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
};

export default function Activities({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [atividades, setAtividades] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // alerta simples (erros ao carregar)
  const [alerta, setAlerta] = useState({ visible: false, title: '', message: '' });

  const exibirAlerta = (title, message) => {
    setAlerta({ visible: true, title, message });
  };
  const fecharAlerta = () => setAlerta(a => ({ ...a, visible: false }));

  // Mesmo padrão das outras telas: usuário logado vem dos params da rota pai
  const state = navigation.getParent()?.getState();
  const routeParams = state?.routes?.find(r => r.name === 'HomeResponsavel' || r.name === 'HomeAdmin')?.params;
  const chefeLogado = routeParams?.params?.user || routeParams?.user || {};

  const obterBranchId = async () => {
    const salvo = await AsyncStorage.getItem('@branch_id');
    const raw = salvo || chefeLogado?.branch_id || chefeLogado?.user?.branch_id || chefeLogado?.id_ramo;
    return raw ? parseInt(raw, 10) : null;
  };

  const carregarAtividades = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('@token_chefe');
      const branchId = await obterBranchId();

      if (!branchId) {
        setAtividades([]);
        return;
      }

      const response = await fetch(`${BASE_URL}/activities/branch/${branchId}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

      const dados = await response.json();
      const lista = Array.isArray(dados) ? dados : (dados.activities || dados.data || []);

      // Mais próximas primeiro
      lista.sort((a, b) => obterData(a).localeCompare(obterData(b)));
      setAtividades(lista);
    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
      exibirAlerta('Erro', 'Não foi possível carregar as atividades.');
    } finally {
      setLoading(false);
    }
  };

  // Recarrega ao voltar da tela de nova atividade
  useFocusEffect(
    useCallback(() => {
      carregarAtividades();
    }, [])
  );

  const atividadesFiltradas = atividades.filter(a =>
    obterNome(a).toLowerCase().includes(search.toLowerCase())
  );

  const hoje = hojeISO();

  const renderItem = ({ item }) => {
    const dataItem = obterData(item);
    const jaPassou = dataItem !== '' && dataItem < hoje;
    const ehHoje = dataItem === hoje;
    const descricao = obterDescricao(item);

    return (
      <View style={[styles.card, jaPassou && { opacity: 0.55 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              <Text style={styles.nomeAtividade}>{obterNome(item) || 'Atividade sem nome'}</Text>
              <Text style={styles.dataAtividade}>• {formatarDataExibicao(dataItem) || 'Sem data'}</Text>
              {ehHoje && (
                <View style={styles.badgeHoje}>
                  <Text style={styles.badgeHojeTexto}>HOJE</Text>
                </View>
              )}
            </View>

            {descricao !== '' && <Text style={styles.descricaoAtividade}>{descricao}</Text>}
          </View>

          <TouchableOpacity
            style={styles.botaoEditar}
            onPress={() => navigation.navigate('CreateActivity', { user: chefeLogado, atividade: item })}
          >
            <Text style={styles.botaoEditarTexto}>Editar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[globalStyles.title, { color: colors.primary, alignSelf: 'flex-start', marginBottom: 15, fontSize: 24, fontWeight: 'bold' }]}>
        Atividades
      </Text>

      <TextInput
        style={styles.busca}
        placeholder="Buscar atividade por nome..."
        placeholderTextColor={colors.text + '80'}
        value={search}
        onChangeText={setSearch}
      />

      <TouchableOpacity
        style={[globalStyles.button, styles.botaoNova]}
        onPress={() => navigation.navigate('CreateActivity', { user: chefeLogado })}
      >
        <Text style={[globalStyles.buttonText, { color: '#FFF', fontWeight: 'bold' }]}>+ Nova Atividade</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={atividadesFiltradas}
          keyExtractor={(item, index) => String(item.id || item._id || index)}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 50 }}>
              <Text style={{ color: colors.text, opacity: 0.5 }}>Nenhuma atividade encontrada.</Text>
            </View>
          }
        />
      )}

      {/* Alerta / confirmação */}
      <Modal visible={alerta.visible} transparent={true} animationType="fade" onRequestClose={fecharAlerta}>
        <View style={styles.modalOverlay}>
          <View style={styles.alertaBox}>
            <Text style={styles.alertaTitulo}>{alerta.title}</Text>
            <Text style={styles.alertaMensagem}>{alerta.message}</Text>

            <TouchableOpacity style={[styles.alertaConfirmar, { width: '100%' }]} onPress={fecharAlerta}>
              <Text style={styles.alertaBotaoTexto}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20 },

  busca: {
    backgroundColor: colors.card,
    color: colors.text,
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    elevation: 2
  },
  botaoNova: {
    backgroundColor: colors.primary,
    marginBottom: 20,
    width: '100%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10
  },

  card: {
    backgroundColor: colors.card,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderLeftWidth: 6,
    borderLeftColor: colors.primary,
    elevation: 3
  },
  nomeAtividade: { fontSize: 17, fontWeight: 'bold', color: colors.text, marginRight: 8 },
  dataAtividade: { fontSize: 13, color: colors.border, fontWeight: '600' },
  badgeHoje: { backgroundColor: OURO_DETALHE, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginLeft: 8 },
  badgeHojeTexto: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  descricaoAtividade: { color: colors.text, opacity: 0.6, marginTop: 4, fontSize: 13 },

  botaoEditar: {
    backgroundColor: colors.primary + '15',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignSelf: 'center'
  },
  botaoEditarTexto: { color: colors.primary, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  alertaBox: { width: '85%', maxWidth: 350, padding: 24, borderRadius: 16, backgroundColor: colors.card, alignItems: 'center', elevation: 5 },
  alertaTitulo: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 10, textAlign: 'center' },
  alertaMensagem: { fontSize: 14, color: colors.text, opacity: 0.8, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  alertaConfirmar: { flex: 0.5, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: colors.primary },
  alertaBotaoTexto: { color: '#FFF', fontWeight: 'bold', fontSize: 15 }
});