import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext } from '../context/ThemeContext';

const BASE_URL = 'https://grupo-escoteiro-ia-gefi-docker-teste.onrender.com';

function decodificarJWT(token) {
  try {
    const partes = token.split('.');
    if (partes.length !== 3) return null;
    const payloadDecodificado = atob(partes[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payloadDecodificado);
  } catch (error) {
    console.log("Erro ao decodificar token localmente:", error);
    return null;
  }
}

export default function Login({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const { carregarTemaDoUsuario } = useContext(ThemeContext);

  const handleLogin = async () => {
    console.log('BOTAO CLICADO');
    if (!email || !senha) {
      Alert.alert('Aviso', 'Preencha o e-mail e a senha.');
      return;
    }

    setLoading(true);

    try { 
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: senha }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'E-mail ou senha incorretos.');
      }

      const { user, token } = data; 
      const tokenSalvar = token || user?.token; 

      // Limpa o que ficou salvo do usuário anterior (ramo, cargo e token)
      await AsyncStorage.multiRemove(['@token_chefe', '@branch_id', '@user_role']);
      
      if (tokenSalvar) {
        await AsyncStorage.setItem('@token_chefe', tokenSalvar);
      }

      let branchIdSalvar = null;
      let cargoToken = null;
      let payloadToken = null;

      if (tokenSalvar) {
        const tokenDecodificado = decodificarJWT(tokenSalvar);
        payloadToken = tokenDecodificado;
        if (tokenDecodificado) {
          branchIdSalvar = tokenDecodificado.branch_id;
          cargoToken = tokenDecodificado.global_role || tokenDecodificado.branch_role;
        }
      }

      if (branchIdSalvar === null || branchIdSalvar === undefined) {
        branchIdSalvar = user?.branch_id ?? data?.branch_id;
      }

      const cargoFinal = cargoToken || user?.global_role || user?.role || 'chefe';
      const cargo = cargoFinal ? cargoFinal.toLowerCase().trim() : '';

      if ((branchIdSalvar === null || branchIdSalvar === undefined) && 
          (cargo === 'presidente' || cargo === 'admin' || cargo === 'administrador')) {
        branchIdSalvar = '0';
        console.log("👑 [LOGIN AJUSTE] Usuário Global detectado. Branch ID definido como 0.");
      } else if ((branchIdSalvar === null || branchIdSalvar === undefined) && cargo === 'financeiro') {
        branchIdSalvar = 'todos';
        console.log("💼 [LOGIN AJUSTE] Usuário Financeiro detectado. Atribuído ao 'todos'.");
      }

      if (branchIdSalvar !== undefined && branchIdSalvar !== null) {
        await AsyncStorage.setItem('@branch_id', branchIdSalvar.toString());
      } else {
        console.warn("⚠️ Aviso: 'branch_id' não encontrado.");
      }

      await AsyncStorage.setItem('@user_role', cargo);

      // Carrega o tema salvo desta conta (modo escuro) já no login
      const idUsuario = user?.id ?? user?.user?.id ?? payloadToken?.id ?? payloadToken?.user_id ?? payloadToken?.sub;
      await carregarTemaDoUsuario(idUsuario);

      const usuarioComEmail = { 
        ...user, 
        email: email,
        role: cargoFinal, 
        branch_id: branchIdSalvar,
        id_ramo: branchIdSalvar 
      };

      if (cargo === 'admin' || cargo === 'presidente' || cargo === 'administrador') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'HomeAdmin', params: { user: usuarioComEmail } }],
        });
      } else if (cargo === 'financeiro') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'HomeFinanceiro', params: { user: usuarioComEmail } }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'HomeResponsavel', params: { user: usuarioComEmail } }],
        });
      }

    } catch (error) {
      console.log("Erro no login:", error);
      Alert.alert('Erro no Login', error.message || 'Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.loginCard}>
        <Image
          source={require('../../assets/logo.jpg')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Login</Text>
        <TextInput
          style={styles.input}
          placeholder="Digite seu email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Digite sua senha"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry={true}
        />
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Entrar</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7', justifyContent: 'center', alignItems: 'center', padding: 20 },
  loginCard: { width: '100%', maxWidth: 400, alignItems: 'center' },
  logo: { width: 150, height: 150, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1A4524', marginBottom: 30 },
  input: { width: '100%', height: 55, backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 15, marginBottom: 15, borderWidth: 1, borderColor: '#CCC' },
  button: { width: '100%', height: 55, backgroundColor: '#1A4524', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 10, elevation: 3 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});