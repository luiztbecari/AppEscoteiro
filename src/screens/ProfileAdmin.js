import React, { useContext, useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileAdmin() {
  const { colors } = useContext(ThemeContext);
  const route = useRoute();
  
  const { chefeId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [dadosChefe, setDadosChefe] = useState(null);

  const BASE_URL = 'https://grupo-escoteiro-ia-gefi-docker-teste.onrender.com';

  useEffect(() => {
    const carregarDadosDoChefe = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem('@token_chefe');
        
        const response = await fetch(`${BASE_URL}/users/${chefeId}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setDadosChefe(data);
        }
      } catch (err) {
        console.log("Erro ao carregar dados do chefe:", err);
      } finally {
        setLoading(false);
      }
    };

    if (chefeId) carregarDadosDoChefe();
  }, [chefeId]);

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
          {loading ? "Carregando..." : (dadosChefe?.name || dadosChefe?.nome || "Chefe de Seção")}
        </Text>

        <Text style={{ fontSize: 16, color: colors.text, opacity: 0.6, marginBottom: 25, textAlign: 'center' }}>
          {dadosChefe?.email || "Email não disponível"}
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          
          <View style={styles.item}>
            <View style={styles.leftInfo}>
              <Ionicons name="briefcase-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
              <Text style={[styles.text, { color: colors.text }]}>Cargo</Text>
            </View>
            {loading ? <ActivityIndicator size="small" color={colors.primary} /> : (
              <Text style={{ color: colors.primary, fontWeight: 'bold' }}>
                {dadosChefe?.role || dadosChefe?.cargo || "Chefe"}
              </Text>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.text + '20' }]} />

          <View style={styles.item}>
            <View style={styles.leftInfo}>
              <Ionicons name="leaf-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
              <Text style={[styles.text, { color: colors.text }]}>Ramo</Text>
            </View>
            {loading ? <ActivityIndicator size="small" color={colors.primary} /> : (
              <Text style={{ color: colors.text, fontWeight: '600' }}>
                {dadosChefe?.branch_name || "Não associado"}
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
              {dadosChefe?.grupo || "Escoteiros do Brasil"}
            </Text>
          </View>

        </View>

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
  divider: { height: 1, marginHorizontal: 15 }
});