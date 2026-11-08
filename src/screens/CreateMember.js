import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { styles as globalStyles } from '../styles/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VERDE_SKILL = '#2E8B57';

export default function CreateMember({ navigation }) {
  const { colors } = useContext(ThemeContext);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [mensagemModal, setMensagemModal] = useState("");
  const [modalSucesso, setModalSucesso] = useState(false);
  const [acaoPosFechamento, setAcaoPosFechamento] = useState(null);

  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(''); // agora guarda no formato DD/MM/AAAA
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const [chefeBranchId, setChefeBranchId] = useState(null);

  const [fisico, setFisico] = useState('1');
  const [tecnico, setTecnico] = useState('1');
  const [experiencia, setExperiencia] = useState('1');

  const BASE_URL = 'https://grupo-escoteiro.onrender.com';

  useEffect(() => {
    const obterRamoDoChefe = async () => {
      try {
        let idEncontrado = await AsyncStorage.getItem('@branch_id');
        if (!idEncontrado && navigation.getParent()?.getState()?.routes[0]?.params?.user?.branch_id) {
          idEncontrado = navigation.getParent()?.getState()?.routes[0]?.params?.user?.branch_id;
        }
        
        if (idEncontrado !== null && idEncontrado !== undefined) {
          setChefeBranchId(String(idEncontrado)); 
        } else {
          setMensagemModal("Não foi possível identificar o seu ramo. Tente relogar no sistema.");
          setModalSucesso(false);
          setModalVisible(true);
        }
      } catch (error) {
        console.error("Erro ao recuperar branch_id:", error);
      }
    };
    obterRamoDoChefe();
  }, []);

  const validarENormalizarNota = (valor) => {
    const num = parseInt(valor, 10);
    return isNaN(num) || num < 1 ? 1 : (num > 10 ? 10 : num);
  };

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

  // Converte DD/MM/AAAA -> AAAA-MM-DD (formato que a API/banco espera)
  const converterParaISO = (dataBR) => {
    const [dia, mes, ano] = dataBR.split('/');
    return `${ano}-${mes}-${dia}`;
  };

  const calcularIdade = (dataISO) => {
    const hoje = new Date();
    const nascimento = new Date(dataISO);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return idade;
  };

  const obterRamoPelaIdade = (idade) => {
    if (idade >= 6 && idade <= 10) return { id: 2, nome: 'Lobinho' };
    if (idade >= 11 && idade <= 14) return { id: 1, nome: 'Escoteiro' };
    if (idade >= 15) return { id: 3, nome: 'Sênior' };
    return null;
  };

  const handleSalvar = async () => {
    if (chefeBranchId === null || chefeBranchId === undefined) {
      setMensagemModal("O Ramo do chefe não foi carregado corretamente.");
      setModalSucesso(false);
      setModalVisible(true);
      return;
    }

    if (!name.trim() || !dateOfBirth.trim() || !registrationNumber.trim()) {
      setMensagemModal("Por favor, preencha todos os campos obrigatórios.");
      setModalSucesso(false);
      setModalVisible(true);
      return;
    }

    const regexData = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regexData.test(dateOfBirth)) {
      setMensagemModal("Use o formato DIA/MÊS/ANO (Ex: 15/04/2010).");
      setModalSucesso(false);
      setModalVisible(true);
      return;
    }

    const dataISO = converterParaISO(dateOfBirth.trim());
    const idade = calcularIdade(dataISO);
    const ramoDestino = obterRamoPelaIdade(idade);

    if (!ramoDestino) {
      setMensagemModal(`Idade inválida (${idade} anos). Só é possível cadastrar membros a partir dos 6 anos de idade.`);
      setModalSucesso(false);
      setModalVisible(true);
      return;
    }

    if (chefeBranchId !== "0" && parseInt(chefeBranchId) !== ramoDestino.id) {
      const nomesRamos = { 1: "Lobinho", 2: "Escoteiro", 3: "Sênior", 4: "Pioneiro" };
      const nomeRamoChefe = nomesRamos[parseInt(chefeBranchId)] || "Desconhecido";
      
      setMensagemModal(`Acesso negado! O jovem possui ${idade} anos (pertence ao Ramo ${ramoDestino.nome}), mas você só possui permissão para cadastrar no Ramo ${nomeRamoChefe}.`);
      setModalSucesso(false);
      setModalVisible(true);
      return;
    }

    try {
      setLoading(true);
      const tokenChefe = await AsyncStorage.getItem('@token_chefe');

      const response = await fetch(`${BASE_URL}/members`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenChefe}`
        },
        body: JSON.stringify({
          name: name.trim(),
          date_of_birth: dataISO,
          registration_number: registrationNumber.trim(),
          branch_id: ramoDestino.id, 
          skill_fisico: validarENormalizarNota(fisico),
          skill_tecnico: validarENormalizarNota(tecnico),
          skill_experiencia: validarENormalizarNota(experiencia)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao salvar o jovem.");
      }

      setMensagemModal(`O jovem ${name} foi cadastrado com sucesso no Ramo ${ramoDestino.nome}!`);
      setModalSucesso(true);
      setAcaoPosFechamento(() => () => navigation.goBack());
      setModalVisible(true);

    } catch (error) {
      setMensagemModal(error.message);
      setModalSucesso(false);
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="always">
        <Text style={[globalStyles.title, { color: colors.primary, marginBottom: 20, fontSize: 24, fontWeight: 'bold' }]}>Novo Membro</Text>

        <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 5 }}>Nome Completo *</Text>
        <TextInput style={[styles.inputBase, { backgroundColor: colors.card, color: colors.text, borderColor: colors.primary + '30' }]} placeholder="Ex: Carlos Eduardo" placeholderTextColor={colors.text + '50'} value={name} onChangeText={setName} />

        <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 5 }}>Data de Nascimento (DD/MM/AAAA) *</Text>
        <TextInput
          style={[styles.inputBase, { backgroundColor: colors.card, color: colors.text, borderColor: colors.primary + '30' }]}
          placeholder="Ex: 15/04/2010"
          placeholderTextColor={colors.text + '50'}
          keyboardType="numeric"
          maxLength={10}
          value={dateOfBirth}
          onChangeText={(texto) => setDateOfBirth(formatarDataBR(texto))}
        />

        <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 5 }}>Número de Registro *</Text>
        <TextInput style={[styles.inputBase, { backgroundColor: colors.card, color: colors.text, borderColor: colors.primary + '30', marginBottom: 25 }]} placeholder="Ex: 54321-X" placeholderTextColor={colors.text + '50'} value={registrationNumber} onChangeText={setRegistrationNumber} />

        <Text style={[styles.tituloSecao, { color: colors.text }]}>Estatísticas Iniciais</Text>

        {[ { name: "fitness", label: "Desempenho Físico", val: fisico, set: setFisico },
           { name: "build", label: "Conhecimento Técnico", val: tecnico, set: setTecnico },
           { name: "ribbon", label: "Tempo / Experiência", val: experiencia, set: setExperiencia }
        ].map((item, index) => (
          <View key={index} style={[styles.rowInput, { backgroundColor: colors.card }]}>
            <View style={styles.lblContainer}>
              <Ionicons name={item.name} size={20} color={VERDE_SKILL} style={{ marginRight: 8 }} />
              <Text style={[styles.labelSkill, { color: colors.text }]}>{item.label}</Text>
            </View>
            <TextInput style={[styles.inputNota, { color: colors.text, borderColor: colors.border }]} keyboardType="numeric" maxLength={2} value={item.val} onChangeText={item.set} onBlur={() => item.set(validarENormalizarNota(item.val).toString())} />
          </View>
        ))}

        <View style={styles.containerBotao}>
          {loading ? <ActivityIndicator size="large" color={colors.primary} /> : (
            <TouchableOpacity style={[styles.btnSalvar, { backgroundColor: colors.primary }]} onPress={handleSalvar}><Text style={styles.btnSalvarText}>SALVAR CADASTRO</Text></TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={{ marginBottom: 15 }}>
              <Ionicons name={modalSucesso ? "checkmark-circle" : "alert-circle"} size={60} color={modalSucesso ? "#4CAF50" : "#FF9800"} />
            </View>
            <Text style={[styles.modalText, { color: colors.text }]}>{mensagemModal}</Text>
            <TouchableOpacity style={[styles.btnModal, { backgroundColor: colors.primary }]} onPress={() => {
              setModalVisible(false);
              if (acaoPosFechamento) setTimeout(acaoPosFechamento, 500);
            }}>
              <Text style={styles.btnSalvarText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  inputBase: { padding: 12, borderRadius: 10, marginBottom: 15, borderWidth: 1 },
  tituloSecao: { fontSize: 13, fontWeight: 'bold', marginBottom: 15, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.5 },
  rowInput: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 12, marginBottom: 15 },
  lblContainer: { flexDirection: 'row', alignItems: 'center' },
  labelSkill: { fontSize: 16, fontWeight: '500' },
  inputNota: { width: 55, height: 45, borderWidth: 1, borderRadius: 8, textAlign: 'center', fontSize: 16, fontWeight: 'bold' },
  containerBotao: { marginTop: 20, marginBottom: 40, width: '100%' },
  btnSalvar: { height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  btnSalvarText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 400, padding: 25, borderRadius: 25, alignItems: 'center', elevation: 10 },
  modalText: { fontSize: 18, fontWeight: '600', marginBottom: 25, textAlign: 'center' },
  btnModal: { paddingVertical: 14, paddingHorizontal: 40, borderRadius: 15, alignItems: 'center' }
});