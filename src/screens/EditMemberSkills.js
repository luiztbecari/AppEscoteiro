import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VERDE_SKILL = '#2E8B57';

export default function EditMemberSkills({ route, navigation }) {
  const { colors } = useContext(ThemeContext);
  const { member } = route.params || {}; 

  const [modalVisible, setModalVisible] = useState(false);
  const [mensagemModal, setMensagemModal] = useState("");
  const [modalAcao, setModalAcao] = useState(null);
  
  const [sucessoExclusao, setSucessoExclusao] = useState(false);

  const [fisico, setFisico] = useState('1');
  const [tecnico, setTecnico] = useState('1');
  const [experiencia, setExperiencia] = useState('1');
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  
  const [isAdmin, setIsAdmin] = useState(false);

  const BASE_URL = 'https://grupo-escoteiro-ia-gefi-docker-teste.onrender.com';

  useEffect(() => {
    setIsAdmin(false);

    if (member) {
      setFisico((member.skill_fisico || 1).toString());
      setTecnico((member.skill_tecnico || 1).toString());
      setExperiencia((member.skill_experiencia || 1).toString());
    }

    const verificarPermissao = async () => {
      try {
        const userLogado = route.params?.user;
        let cargoFinal = userLogado?.role || userLogado?.global_role || userLogado?.cargo;
        const cacheRole = await AsyncStorage.getItem('@user_role');
        
        if (!cargoFinal) cargoFinal = cacheRole;

        if (cargoFinal) {
          const cargoNormalizado = String(cargoFinal).toLowerCase().trim();
          if (['admin', 'administrador', 'presidente', 'administrator'].includes(cargoNormalizado)) {
            setIsAdmin(true);
            return;
          }
        }
        setIsAdmin(false);
      } catch (error) {
        setIsAdmin(false); 
      }
    };
    verificarPermissao();
  }, [member, route.params]);

  const validarENormalizarNota = (valor) => {
    const num = parseInt(valor, 10);
    if (isNaN(num) || num < 1) return 1;
    if (num > 10) return 10;
    return num;
  };

  const salvarSkills = async () => {
    if (!member) {
      setMensagemModal("Dados do membro não encontrados.");
      setModalAcao(null);
      setSucessoExclusao(false);
      setModalVisible(true);
      return;
    }
    setMensagemModal("Deseja realmente atualizar as estatísticas deste membro?");
    setModalAcao(() => executarSalvamento);
    setSucessoExclusao(false);
    setModalVisible(true);
  };

  const executarSalvamento = async () => {
    setSalvando(true);
    try {
      const tokenChefe = await AsyncStorage.getItem('@token_chefe');
      const idMembro = member.id || member._id;
      const response = await fetch(`${BASE_URL}/members/${idMembro}/skills`, {
        method: 'PUT',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenChefe}` },
        body: JSON.stringify({ skill_fisico: validarENormalizarNota(fisico), skill_tecnico: validarENormalizarNota(tecnico), skill_experiencia: validarENormalizarNota(experiencia) })
      });

      if (!response.ok) throw new Error('Erro ao salvar.');
      
      setMensagemModal("Estatísticas atualizadas com sucesso!");
      setModalAcao(null);
      setSucessoExclusao(false);
    } catch (error) {
      setMensagemModal("Não foi possível salvar.");
      setModalAcao(null);
      setSucessoExclusao(false);
    } finally {
      setSalvando(false);
    }
  };

  const handleDeletarMembro = () => {
    const nomeMembro = member?.nome || member?.name || "este membro";
    setMensagemModal(`Tem certeza absoluta que deseja excluir permanentemente ${nomeMembro} do sistema?`);
    setModalAcao(() => executarExclusao);
    setSucessoExclusao(false);
    setModalVisible(true);
  };

  const executarExclusao = async () => {
    setExcluindo(true);
    try {
      const tokenChefe = await AsyncStorage.getItem('@token_chefe');
      const idMembro = member?.id || member?._id;
      const response = await fetch(`${BASE_URL}/members/${idMembro}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenChefe}` }
      });

      if (!response.ok) throw new Error("Erro ao excluir.");
      
      setMensagemModal("Membro excluído com sucesso!");
      setModalAcao(null); 
      setSucessoExclusao(true); 

    } catch (error) {
      setMensagemModal("Erro ao remover membro.");
      setModalAcao(null);
      setSucessoExclusao(false);
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="always">
        <View style={[styles.cardIdentidade, { backgroundColor: colors.card, borderColor: colors.primary + '20' }]}>
          <Ionicons name="person-circle" size={50} color={colors.primary} />
          <View style={styles.infoIdentidade}>
            <Text style={[styles.nomeMembro, { color: colors.text }]}>{member?.nome || member?.name || 'Membro'}</Text>
            <Text style={{ color: colors.text + '99', fontSize: 14 }}>{member?.branch_name || member?.ramo || 'Escoteiro'}</Text>
          </View>
        </View>

        <Text style={[styles.tituloSecao, { color: colors.text }]}>Estatísticas (Valores de 1 a 10)</Text>

        <View style={[styles.rowInput, { backgroundColor: colors.card }]}>
          <View style={styles.lblContainer}><Ionicons name="fitness" size={20} color={VERDE_SKILL} style={{ marginRight: 8 }} /><Text style={[styles.labelSkill, { color: colors.text }]}>Desempenho Físico</Text></View>
          <TextInput style={[styles.inputNota, { color: colors.text, borderColor: colors.border }]} keyboardType="numeric" maxLength={2} value={fisico} onChangeText={setFisico} onBlur={() => setFisico(validarENormalizarNota(fisico).toString())} />
        </View>

        <View style={[styles.rowInput, { backgroundColor: colors.card }]}>
          <View style={styles.lblContainer}><Ionicons name="build" size={20} color={VERDE_SKILL} style={{ marginRight: 8 }} /><Text style={[styles.labelSkill, { color: colors.text }]}>Conhecimento Técnico</Text></View>
          <TextInput style={[styles.inputNota, { color: colors.text, borderColor: colors.border }]} keyboardType="numeric" maxLength={2} value={tecnico} onChangeText={setTecnico} onBlur={() => setTecnico(validarENormalizarNota(tecnico).toString())} />
        </View>

        <View style={[styles.rowInput, { backgroundColor: colors.card }]}>
          <View style={styles.lblContainer}><Ionicons name="ribbon" size={20} color={VERDE_SKILL} style={{ marginRight: 8 }} /><Text style={[styles.labelSkill, { color: colors.text }]}>Tempo / Experiência</Text></View>
          <TextInput style={[styles.inputNota, { color: colors.text, borderColor: colors.border }]} keyboardType="numeric" maxLength={2} value={experiencia} onChangeText={setExperiencia} onBlur={() => setExperiencia(validarENormalizarNota(experiencia).toString())} />
        </View>

        <TouchableOpacity style={[styles.btnSalvar, { backgroundColor: colors.primary }]} onPress={salvarSkills} disabled={salvando || excluindo}>
          {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnSalvarText}>ATUALIZAR NOTAS</Text>}
        </TouchableOpacity>

        {isAdmin && (
          <TouchableOpacity style={styles.btnExcluir} onPress={handleDeletarMembro} disabled={salvando || excluindo}>
            {excluindo ? <ActivityIndicator color="#FFF" /> : <React.Fragment><Ionicons name="trash-outline" size={20} color="#FFF" style={{ marginRight: 8 }} /><Text style={styles.btnSalvarText}>EXCLUIR MEMBRO</Text></React.Fragment>}
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            
            <View style={{ marginBottom: 15 }}>
              {modalAcao ? (
                <Ionicons name="alert-circle" size={60} color="#FF9800" />
              ) : excluindo || salvando ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : (
                <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
              )}
            </View>

            <Text style={[styles.modalText, { color: colors.text }]}>{mensagemModal}</Text>
            
            <View style={{ flexDirection: 'row', width: '100%', gap: 10 }}>
              {modalAcao && (
                <TouchableOpacity 
                  style={[styles.btnModal, { backgroundColor: '#777', flex: 1 }]} 
                  disabled={salvando || excluindo}
                  onPress={() => { 
                    setModalVisible(false); 
                    setModalAcao(null);
                  }}
                >
                  <Text style={styles.btnSalvarText}>CANCELAR</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[
                  styles.btnModal, 
                  { 
                    backgroundColor: modalAcao ? (modalAcao === executarExclusao ? '#D32F2F' : '#4CAF50') : colors.primary, 
                    flex: 1,
                    opacity: (salvando || excluindo) ? 0.7 : 1
                  }
                ]} 
                disabled={salvando || excluindo} 
                onPress={() => {
                  if (modalAcao) {
                    modalAcao();
                  } else {
                    setModalVisible(false);
                    
                    if (sucessoExclusao) {
                      if (navigation.canGoBack()) {
                        navigation.goBack();
                      } else {
                        navigation.navigate('ManageMembers');
                      }
                    }
                    setSucessoExclusao(false);
                  }
                }}
              >
                <Text style={styles.btnSalvarText}>{modalAcao ? "CONFIRMAR" : "OK"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  cardIdentidade: { flexDirection: 'row', padding: 15, borderRadius: 15, alignItems: 'center', marginBottom: 25, borderWidth: 1 },
  infoIdentidade: { marginLeft: 15, flex: 1 },
  nomeMembro: { fontSize: 18, fontWeight: 'bold' },
  tituloSecao: { fontSize: 14, fontWeight: 'bold', marginBottom: 15, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.5 },
  rowInput: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 12, marginBottom: 15 },
  lblContainer: { flexDirection: 'row', alignItems: 'center' },
  labelSkill: { fontSize: 16, fontWeight: '500' },
  inputNota: { width: 55, height: 45, borderWidth: 1, borderRadius: 8, textAlign: 'center', fontSize: 16, fontWeight: 'bold' },
  btnSalvar: { height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  btnExcluir: { height: 55, borderRadius: 12, backgroundColor: '#D32F2F', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 15, marginBottom: 20 },
  btnSalvarText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 400, padding: 25, borderRadius: 25, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10 },
  modalText: { fontSize: 18, fontWeight: '600', marginBottom: 25, textAlign: 'center', lineHeight: 24 },
  btnModal: { paddingVertical: 14, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }
});