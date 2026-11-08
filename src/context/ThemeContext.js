import React, { createContext, useState, useMemo, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// A preferência é salva por usuário: @tema_escuro_<idDoUsuario>
export const PREFIXO_TEMA = '@tema_escuro_';

const lightColors = {
  background: '#F5F5F7',
  card: '#ffffff',
  text: '#333333',
  border: '#dddddd',
  primary: '#1A4524'
};

const darkColors = {
  background: '#121212',
  card: '#1E1E1E',
  text: '#EDEDED',
  border: '#3A3A3A',
  primary: '#3E8E54' // verde mais claro para ter contraste no fundo escuro
};

export const ThemeContext = createContext({
  colors: lightColors,
  isDark: false,
  usuarioId: null,
  toggleTheme: () => {},
  setDarkMode: () => {},
  carregarTemaDoUsuario: async () => {},
  resetarTema: () => {}
});

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const [usuarioId, setUsuarioId] = useState(null);
  const usuarioIdRef = useRef(null);

  // Chamar logo após o login: carrega o tema salvo para ESTA conta
  // (se a conta nunca ativou o modo escuro, fica no claro).
  const carregarTemaDoUsuario = useCallback(async (id) => {
    if (id === undefined || id === null || id === '') return;
    const idStr = String(id);
    usuarioIdRef.current = idStr;
    setUsuarioId(idStr);
    try {
      const salvo = await AsyncStorage.getItem(PREFIXO_TEMA + idStr);
      setIsDark(salvo === 'true');
    } catch (error) {
      console.error('Erro ao carregar tema do usuário:', error);
      setIsDark(false);
    }
  }, []);

  // Chamar no logout: volta para o tema claro e desvincula o usuário
  const resetarTema = useCallback(() => {
    usuarioIdRef.current = null;
    setUsuarioId(null);
    setIsDark(false);
  }, []);

  const setDarkMode = useCallback(async (valor) => {
    setIsDark(valor);
    const id = usuarioIdRef.current;
    if (!id) return; // sem usuário identificado, não grava
    try {
      await AsyncStorage.setItem(PREFIXO_TEMA + id, String(valor));
    } catch (error) {
      console.error('Erro ao salvar tema:', error);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setDarkMode(!isDark);
  }, [isDark, setDarkMode]);

  const theme = useMemo(() => ({
    colors: isDark ? darkColors : lightColors,
    isDark,
    usuarioId,
    toggleTheme,
    setDarkMode,
    carregarTemaDoUsuario,
    resetarTema
  }), [isDark, usuarioId, toggleTheme, setDarkMode, carregarTemaDoUsuario, resetarTema]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}