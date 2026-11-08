import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { styles as globalStyles } from '../styles/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// AAAA-MM-DD -> DD/MM/AAAA (sem passar por Date, evita erro de fuso horário)
const isoParaBR = (valor) => {
  const [ano, mes, dia] = String(valor || '').slice(0, 10).split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : '';
};

export default function CreateActivity({ navigation, route }) {
  const { colors } = useContext(ThemeContext);
  const chefeLogado = route.params?.user || {};

  // Se vier uma atividade nos params, a tela funciona como "Editar"
  const atividadeEdit = route.params?.atividade;
  const isEditing = !!atividadeEdit;
  const idAtividade = atividadeEdit?.id || atividadeEdit?._id;

  const [modalVisible, setModalVisible] = useState(false);
  const [mensagemModal, setMensagemModal] = useState("");
  const [modalSucesso, setModalSucesso] = useState(false);
  const [acaoPosFechamento, setAcaoPosFechamento] = useState(null);
  const [modalAcao, setModalAcao] = useState(null); // quando existe, o modal vira confirmação

  const [nome, setNome] = useState(atividadeEdit?.title || atividadeEdit?.name || atividadeEdit?.nome || '');
  const [data, setData] = useState(isoParaBR(atividadeEdit?.activity_date)); // formato DD/MM/AAAA
  const [descricao, setDescricao] = useState(atividadeEdit?.description || '');
  const [loading, setLoading] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [sugerindo, setSugerindo] = useState(false);

  const BASE_URL = 'https://grupo-escoteiro.onrender.com';

  // Formata a digitação como DD/MM/AAAA conforme o usuário digita números
  const formatarDataBR = (texto) => {
    const numeros = texto.replace(/\D/g, '').slice(0, 8);
    if (numeros.length > 4) {
      return `${numeros.slice(0, 2)}/${numeros.slice(2, 4)}/${numeros.slice(4, 8)}`;
    } else if (numeros.length > 2) {
      return `${numeros.slice(0, 2)}/${numeros.slice(2, 4)}`;
    }
    return numeros;
  };

  // Converte DD/MM/AAAA -> AAAA-MM-DD, recusando datas que não existem (ex.: 31/02/2026)
  const converterParaISO = (dataBR) => {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dataBR)) return null;
    const [dia, mes, ano] = dataBR.split('/').map(Number);
    const dt = new Date(ano, mes - 1, dia);
    if (dt.getFullYear() !== ano || dt.getMonth() !== mes - 1 || dt.getDate() !== dia) return null;
    return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  };

  const mostrarMensagem = (mensagem, sucesso = false, acao = null) => {
    setMensagemModal(mensagem);
    setModalSucesso(sucesso);
    setModalAcao(null);
    setAcaoPosFechamento(acao ? () => acao : null);
    setModalVisible(true);
  };

  const mostrarConfirmacao = (mensagem, acao) => {
    setMensagemModal(mensagem);
    setModalSucesso(false);
    setAcaoPosFechamento(null);
    setModalAcao(() => acao);
    setModalVisible(true);
  };

  // Pede ao backend uma sugestão de atividade feita pela IA (usa o campo Nome como tema)
  const handleSugerirIA = async () => {
    if (sugerindo || loading || excluindo) return;

    if (nome.trim().length < 3) {
      mostrarMensagem("Digite um tema no campo Nome (mínimo 3 letras) para a IA sugerir.");
      return;
    }

    try {
      setSugerindo(true);
      const tokenChefe = await AsyncStorage.getItem('@token_chefe');
      const salvo = await AsyncStorage.getItem('@branch_id');
      const rawBranchId = salvo || atividadeEdit?.branch_id || chefeLogado?.branch_id || chefeLogado?.user?.branch_id || chefeLogado?.id_ramo;
      const branchId = rawBranchId ? parseInt(rawBranchId, 10) : null;

      if (!branchId) {
        mostrarMensagem("Não foi possível identificar o seu ramo. Tente relogar no sistema.");
        return;
      }

      const response = await fetch(`${BASE_URL}/activities/suggestions`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenChefe}`
        },
        body: JSON.stringify({ branch_id: branchId, tema: nome.trim() })
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Não foi possível gerar a sugestão.");

      const sugestao = json.atividades[0];
      setNome(sugestao.title);
      setDescricao(sugestao.description);
    } catch (error) {
      mostrarMensagem(error.message);
    } finally {
      setSugerindo(false);
    }
  };

  const handleSalvar = async () => {
    if (loading || excluindo || sugerindo) return;

    if (!nome.trim() || !data.trim() || !descricao.trim()) {
      mostrarMensagem("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const dataISO = converterParaISO(data.trim());
    if (!dataISO) {
      mostrarMensagem("Use uma data real no formato DIA/MÊS/ANO (Ex: 15/11/2026).");
      return;
    }

    try {
      setLoading(true);
      const tokenChefe = await AsyncStorage.getItem('@token_chefe');
      const salvo = await AsyncStorage.getItem('@branch_id');
      const rawBranchId = salvo || atividadeEdit?.branch_id || chefeLogado?.branch_id || chefeLogado?.user?.branch_id || chefeLogado?.id_ramo;
      const branchId = rawBranchId ? parseInt(rawBranchId, 10) : null;
      const userId = chefeLogado?.id || chefeLogado?.user?.id;

      if (!branchId) {
        mostrarMensagem("Não foi possível identificar o seu ramo. Tente relogar no sistema.");
        return;
      }

      const payload = {
        title: nome.trim(),
        description: descricao.trim(),
        activity_date: dataISO,
        branch_id: branchId
      };
      if (!isEditing) payload.created_by = userId ? Number(userId) : null;

      const response = await fetch(isEditing ? `${BASE_URL}/activities/${idAtividade}` : `${BASE_URL}/activities`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenChefe}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const txt = await response.text();
        let msg = "Erro ao salvar a atividade.";
        try {
          const json = JSON.parse(txt);
          msg = json.error || json.message || msg;
        } catch {
          if (txt) msg = txt;
        }
        throw new Error(msg);
      }

      mostrarMensagem(
        isEditing
          ? `A atividade "${nome.trim()}" foi atualizada com sucesso!`
          : `A atividade "${nome.trim()}" foi cadastrada com sucesso!`,
        true,
        () => navigation.goBack()
      );
    } catch (error) {
      mostrarMensagem(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = () => {
    mostrarConfirmacao(
      `Tem certeza que deseja excluir permanentemente a atividade "${nome.trim() || 'sem nome'}"?`,
      executarExclusao
    );
  };

  const executarExclusao = async () => {
    try {
      setExcluindo(true);
      const tokenChefe = await AsyncStorage.getItem('@token_chefe');

      const response = await fetch(`${BASE_URL}/activities/${idAtividade}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${tokenChefe}` }
      });

      if (!response.ok) throw new Error("Erro ao excluir a atividade no servidor.");

      mostrarMensagem("Atividade excluída com sucesso!", true, () => navigation.goBack());
    } catch (error) {
      mostrarMensagem(error.message);
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="always">
        <Text style={[globalStyles.title, { color: colors.primary, marginBottom: 20, fontSize: 24, fontWeight: 'bold' }]}>
          {isEditing ? 'Editar Atividade' : 'Nova Atividade'}
        </Text>

        <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 5 }}>Nome da Atividade *</Text>
        <View style={styles.linhaNome}>
          <TextInput
            style={[styles.inputBase, styles.inputNome, { backgroundColor: colors.card, color: colors.text, borderColor: colors.primary + '30' }]}
            placeholder="Ex: Acampamento de Primavera"
            placeholderTextColor={colors.text + '50'}
            value={nome}
            onChangeText={setNome}
          />
          <TouchableOpacity
            style={[styles.btnIA, { backgroundColor: colors.primary }]}
            onPress={handleSugerirIA}
            disabled={sugerindo || loading || excluindo}
          >
            {sugerindo ? <ActivityIndicator color="#FFF" /> : <Ionicons name="sparkles" size={22} color="#FFF" />}
          </TouchableOpacity>
        </View>

        <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 5 }}>Data da Atividade (DD/MM/AAAA) *</Text>
        <TextInput
          style={[styles.inputBase, { backgroundColor: colors.card, color: colors.text, borderColor: colors.primary + '30' }]}
          placeholder="Ex: 15/11/2026"
          placeholderTextColor={colors.text + '50'}
          keyboardType="numeric"
          maxLength={10}
          value={data}
          onChangeText={(texto) => setData(formatarDataBR(texto))}
        />

        <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 5 }}>Descrição *</Text>
        <TextInput
          style={[styles.inputBase, styles.inputDescricao, { backgroundColor: colors.card, color: colors.text, borderColor: colors.primary + '30' }]}
          placeholder="Descreva o que será feito, local, materiais..."
          placeholderTextColor={colors.text + '50'}
          multiline
          textAlignVertical="top"
          value={descricao}
          onChangeText={setDescricao}
        />

        <View style={styles.containerBotao}>
          {loading ? <ActivityIndicator size="large" color={colors.primary} /> : (
            <TouchableOpacity
              style={[styles.btnSalvar, { backgroundColor: colors.primary }]}
              onPress={handleSalvar}
              disabled={excluindo || sugerindo}
            >
              <Text style={styles.btnSalvarText}>{isEditing ? 'SALVAR ALTERAÇÕES' : 'SALVAR ATIVIDADE'}</Text>
            </TouchableOpacity>
          )}

          {isEditing && (
            <TouchableOpacity
              style={styles.btnExcluir}
              onPress={handleExcluir}
              disabled={loading || excluindo || sugerindo}
            >
              {excluindo ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <Ionicons name="trash-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.btnSalvarText}>EXCLUIR ATIVIDADE</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => { setModalVisible(false); setModalAcao(null); }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={{ marginBottom: 15 }}>
              {modalAcao ? (
                <Ionicons name="alert-circle" size={60} color="#FF9800" />
              ) : (
                <Ionicons name={modalSucesso ? "checkmark-circle" : "alert-circle"} size={60} color={modalSucesso ? "#4CAF50" : "#FF9800"} />
              )}
            </View>
            <Text style={[styles.modalText, { color: colors.text }]}>{mensagemModal}</Text>

            {modalAcao ? (
              <View style={{ flexDirection: 'row', width: '100%', gap: 10 }}>
                <TouchableOpacity
                  style={[styles.btnModalLinha, { backgroundColor: '#777' }]}
                  onPress={() => { setModalVisible(false); setModalAcao(null); }}
                >
                  <Text style={styles.btnSalvarText}>CANCELAR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnModalLinha, { backgroundColor: '#D32F2F' }]}
                  onPress={() => {
                    const acao = modalAcao;
                    setModalVisible(false);
                    setModalAcao(null);
                    setTimeout(acao, 300);
                  }}
                >
                  <Text style={styles.btnSalvarText}>EXCLUIR</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={[styles.btnModal, { backgroundColor: colors.primary }]} onPress={() => {
                setModalVisible(false);
                if (acaoPosFechamento) setTimeout(acaoPosFechamento, 500);
              }}>
                <Text style={styles.btnSalvarText}>OK</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  inputBase: { padding: 12, borderRadius: 10, marginBottom: 15, borderWidth: 1 },
  inputDescricao: { height: 140, paddingTop: 12, marginBottom: 25 },
  containerBotao: { marginTop: 10, marginBottom: 40, width: '100%' },
  linhaNome: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  inputNome: { flex: 1, height: 46, marginBottom: 0, marginRight: 10 },
  btnIA: { width: 46, height: 46, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  btnSalvar: { height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  btnExcluir: { height: 52, borderRadius: 12, backgroundColor: '#D32F2F', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 15 },
  btnSalvarText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 400, padding: 25, borderRadius: 25, alignItems: 'center', elevation: 10 },
  modalText: { fontSize: 18, fontWeight: '600', marginBottom: 25, textAlign: 'center' },
  btnModal: { paddingVertical: 14, paddingHorizontal: 40, borderRadius: 15, alignItems: 'center' },
  btnModalLinha: { flex: 1, paddingVertical: 14, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }
});