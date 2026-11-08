import React, { useState, useEffect, useContext, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Modal,
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext } from '../context/ThemeContext';

export default function CreateLeader({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [branchId, setBranchId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);

  const [opcoesRamos, setOpcoesRamos] = useState([]);
  const [loadingRamos, setLoadingRamos] = useState(false);

  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '', onClose: null });

  const BASE_URL = 'https://grupo-escoteiro.onrender.com';

  const carregarRamosDoBanco = async () => {
    try {
      setLoadingRamos(true);
      const adminToken = await AsyncStorage.getItem('@token_chefe');
      
      const response = await fetch(`${BASE_URL}/branches`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOpcoesRamos(data);
      } else {
        console.error("Falha ao carregar ramos do banco:", response.status);
      }
    } catch (error) {
      console.error("Erro de conexão ao buscar ramos:", error);
    } finally {
      setLoadingRamos(false);
    }
  };

  useEffect(() => {
    carregarRamosDoBanco();
  }, []);

  const exibirAlerta = (titulo, mensagem, acaoSucesso = null) => {
    setCustomAlert({
      visible: true,
      title: titulo,
      message: mensagem,
      onClose: acaoSucesso
    });
  };

  const handleSaveLeader = async () => {
    if (loading) return;

    if (!name.trim() || !email.trim() || !password.trim() || !branchId) {
      exibirAlerta('Atenção', 'Por favor, preencha todos os campos e selecione o Ramo.');
      return;
    }

    try {
      setLoading(true);
      const adminToken = await AsyncStorage.getItem('@token_chefe');

      console.log('🚀 [ENVIO] Dados salvando no servidor:', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        global_role: 'chefe',
        branch_id: branchId
      });

      const res = await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: password,
          global_role: 'chefe', 
          branch_role: 'chefe de seção',
          branch_id: branchId,
          id_ramo: branchId 
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.log('Error from server when creating leader:', errorText);
        
        let mensagemInterface = 'Verifique os dados informados.';
        try {
          const parsedError = JSON.parse(errorText);
          mensagemInterface = parsedError.error || parsedError.message || mensagemInterface;
          
          if (mensagemInterface.includes('users_email_key')) {
            mensagemInterface = 'Este e-mail já está cadastrado no sistema. Tente outro!';
          }
        } catch (e) {
          mensagemInterface = errorText || mensagemInterface;
        }

        exibirAlerta('Não foi possível cadastrar', mensagemInterface);
        return;
      }

      setName('');
      setEmail('');
      setPassword('');
      setBranchId(null);

      exibirAlerta(
        'Sucesso!', 
        `Chefe cadastrado com sucesso e alocado no Ramo solicitado!`, 
        () => navigation.goBack()
      );

    } catch (err) {
      console.log('⚠️ Network error when creating leader:', err);
      exibirAlerta('Erro de Rede', 'Falha ao conectar com o servidor. Verifique sua internet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.rootContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Novo Chefe de Seção</Text>
          <Text style={styles.subtitle}>Preencha os dados para registrar o acesso e definir o ramo de atuação do chefe.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Nome Completo</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color={colors.primary} style={styles.inputIcon} />
            <TextInput 
              style={styles.input}
              placeholder="Ex: Luis Gustavo"
              placeholderTextColor={colors.text + '70'}
              value={name}
              onChangeText={setName}
            />
          </View>

          <Text style={styles.label}>E-mail de Acesso</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} style={styles.inputIcon} />
            <TextInput 
              style={styles.input}
              placeholder="Ex: chefe.ramo@teste.com"
              placeholderTextColor={colors.text + '70'}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <Text style={styles.label}>Senha Provisória</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
            <TextInput 
              style={styles.input}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor={colors.text + '70'}
              secureTextEntry={secureText}
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setSecureText(!secureText)}>
              <Ionicons name={secureText ? "eye-off-outline" : "eye-outline"} size={20} color={colors.text + '90'} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Selecione o Ramo de Atuação *</Text>
          <View style={{ marginBottom: 20, marginTop: 5 }}>
            {loadingRamos ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ alignSelf: 'flex-start' }} />
            ) : (
              <View style={styles.containerAbas}>
                {opcoesRamos.map((ramo) => {
                  const selecionado = branchId === ramo.id;
                  const nomeExibicao = ramo.name || ramo.nome;

                  return (
                    <TouchableOpacity
                      key={ramo.id}
                      onPress={() => setBranchId(ramo.id)}
                      style={[
                        styles.abaRamo,
                        selecionado ? styles.abaSelecionada : styles.abaDesativada
                      ]}
                    >
                      <Text style={[styles.abaTexto, { color: selecionado ? '#FFF' : colors.text }]}>
                        {nomeExibicao}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <TouchableOpacity 
            style={styles.btnSave}
            onPress={handleSaveLeader}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Text style={styles.btnText}>Ativar Cadastro de Chefe</Text>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.btnCancel}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.btnCancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={customAlert.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setCustomAlert({ ...customAlert, visible: false });
          if (customAlert.onClose) customAlert.onClose();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.customAlertBox}>
            <Text style={styles.customAlertTitle}>{customAlert.title}</Text>
            <Text style={styles.customAlertMessage}>{customAlert.message}</Text>
            <TouchableOpacity 
              style={styles.customAlertButton}
              onPress={() => {
                setCustomAlert({ ...customAlert, visible: false });
                if (customAlert.onClose) customAlert.onClose();
              }}
            >
              <Text style={styles.customAlertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 20 },
  header: { marginTop: 15, marginBottom: 25 },
  title: { fontSize: 24, fontWeight: '800', color: colors.primary },
  subtitle: { fontSize: 14, color: colors.text, opacity: 0.7, marginTop: 5, lineHeight: 20 },
  form: { backgroundColor: colors.card, padding: 20, borderRadius: 16, elevation: 3, marginBottom: 30 },
  label: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 6 },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.background, 
    borderWidth: 1, 
    borderColor: colors.border, 
    borderRadius: 10, 
    paddingHorizontal: 12, 
    height: 50, 
    marginBottom: 20 
  },
  inputIcon: { marginRight: 10 },
  input: { 
    flex: 1, 
    color: colors.text, 
    fontSize: 15,
    outlineStyle: 'none',
    outlineWidth: 0 
  },
  
  containerAbas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  abaRamo: { paddingVertical: 10, paddingHorizontal: 8, borderRadius: 20, borderWidth: 1 },
  abaSelecionada: { backgroundColor: colors.primary, borderColor: colors.primary },
  abaDesativada: { backgroundColor: colors.background, borderColor: colors.border },
  abaTexto: { fontWeight: 'bold', fontSize: 13 },
  btnSave: { 
    flexDirection: 'row',
    backgroundColor: colors.primary, 
    height: 52, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 10,
    elevation: 2
  },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  btnCancel: { height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  btnCancelText: { color: colors.text, opacity: 0.6, fontSize: 15, fontWeight: '600' },

  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 20 
  },
  customAlertBox: { 
    width: '85%', 
    maxWidth: 350, 
    padding: 24, 
    borderRadius: 16, 
    backgroundColor: colors.card,
    alignItems: 'center', 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 4, 
    elevation: 5 
  },
  customAlertTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: colors.primary,
    marginBottom: 10, 
    textAlign: 'center' 
  },
  customAlertMessage: { 
    fontSize: 14, 
    color: colors.text,
    textAlign: 'center', 
    marginBottom: 20, 
    lineHeight: 20 
  },
  customAlertButton: { 
    width: '100%', 
    paddingVertical: 12, 
    backgroundColor: colors.primary,
    borderRadius: 10, 
    alignItems: 'center' 
  },
  customAlertButtonText: { 
    color: '#FFF', 
    fontWeight: 'bold', 
    fontSize: 15 
  }
});