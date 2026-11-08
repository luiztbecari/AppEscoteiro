import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useState, useContext, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { ThemeContext } from '../context/ThemeContext';
import { styles as globalStyles } from '../styles/styles'; 
import { Ionicons } from '@expo/vector-icons';

export default function Group({ navigation, route }) {
  const { colors } = useContext(ThemeContext);
  const [patrulhas, setPatrulhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ramoFiltro, setRamoFiltro] = useState('0'); 

  const idChefeFiltro = route.params?.id_chefe_filtro;
  const nomeChefeFiltro = route.params?.nome_chefe_filtro;
  const [userBranchId, setUserBranchId] = useState(null);
  const BASE_URL = 'https://grupo-escoteiro.onrender.com';

const carregarPatrulhas = async () => {
    try {
      setLoading(true);
      const tokenChefe = await AsyncStorage.getItem('@token_chefe');
      const armazenadoBranchId = await AsyncStorage.getItem('@branch_id');
      const branchId = armazenadoBranchId || '1'; 

      const url = (branchId === "0" || branchId === 0) 
        ? `${BASE_URL}/patrols` 
        : `${BASE_URL}/patrols/branch/${branchId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${tokenChefe}` }
      });

      if (!response.ok) throw new Error();
      
      const data = await response.json();
      const listaBruta = Array.isArray(data) ? data : (data.patrols || data.data || []);

      const listaComDetalhes = await Promise.all(listaBruta.map(async (p) => {
        if (p.membros && p.membros.length > 0) return p;

        try {
          const resDetalhe = await fetch(`${BASE_URL}/patrols/${p._id || p.id}`, {
            headers: { 'Authorization': `Bearer ${tokenChefe}` }
          });
          if (resDetalhe.ok) {
            const detalhe = await resDetalhe.json();
            return detalhe;
          }
        } catch (e) {
          console.log("Erro ao buscar detalhes da patrulha", p._id);
        }
        return p;
      }));

      setPatrulhas(listaComDetalhes);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar as patrulhas.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
  const carregarCargo = async () => {
    const id = await AsyncStorage.getItem('@branch_id');
    setUserBranchId(id);
  };
  carregarCargo();
  carregarPatrulhas();
}, []));

  const patrulhasExibidas = patrulhas.filter(p => {
    const passaChefe = !idChefeFiltro || String(p.user_id || p.leader_id || '') === String(idChefeFiltro);
    
    const passaRamo = ramoFiltro === '0' || String(p.branch_id) === String(ramoFiltro);
    
    return passaChefe && passaRamo;
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {idChefeFiltro && (
        <View style={{ flexDirection: 'row', backgroundColor: '#DAA520', paddingVertical: 10, paddingHorizontal: 20, justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 13 }} numberOfLines={1}>Filtrado por: {nomeChefeFiltro}</Text>
          <TouchableOpacity onPress={() => navigation.setParams({ id_chefe_filtro: undefined })} style={{ backgroundColor: 'rgba(0,0,0,0.1)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 }}>
            <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 12 }}>Ver Todas</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ flex: 1, padding: 20 }}>
        <Text style={[
          globalStyles.title, 
          { 
            color: colors.primary, 
            textAlign: 'center', 
            marginBottom: 20, 
            fontSize: 24, 
            fontWeight: 'bold' 
          }
        ]}>
          Gerenciamento de Patrulhas
          </Text>

        {userBranchId !== "0" && (
          <TouchableOpacity
            style={[globalStyles.button, { backgroundColor: colors.primary, marginBottom: 20, width: '100%', height: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 10 }]}
            onPress={() => navigation.navigate('CriarPatrulha', { patrulha: null })}
          >
            <Text style={[globalStyles.buttonText, { color: '#FFF', fontWeight: 'bold' }]}>+ Nova Patrulha</Text>
          </TouchableOpacity>
        )}

{userBranchId === "0" && (
  <View style={{ marginBottom: 20 }}>
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      contentContainerStyle={{ 
        flexGrow: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        paddingHorizontal: 20 
      }}
    >
      {[
        { id: '0', name: 'Todos' },
        { id: '1', name: 'Escoteiro' },
        { id: '2', name: 'Lobinho' },
        { id: '3', name: 'Sênior' },
      ].map((ramo) => (
        <TouchableOpacity 
          key={ramo.id}
          onPress={() => setRamoFiltro(ramo.id)}
          style={{ 
            paddingHorizontal: 16, 
            paddingVertical: 8, 
            marginHorizontal: 5,
            borderRadius: 20, 
            backgroundColor: ramoFiltro === ramo.id ? colors.primary : '#FFF',
            borderWidth: 1, 
            borderColor: ramoFiltro === ramo.id ? colors.primary : '#DDD',
            justifyContent: 'center',
            height: 36
          }}
        >
          <Text style={{ 
            color: ramoFiltro === ramo.id ? '#FFF' : '#555', 
            fontWeight: ramoFiltro === ramo.id ? 'bold' : '500',
            fontSize: 12 
          }}>
            {ramo.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
)}

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={patrulhasExibidas}
            keyExtractor={(item) => (item._id || item.id || Math.random().toString()).toString()}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={{ backgroundColor: colors.card, padding: 15, borderRadius: 12, marginBottom: 15, borderLeftWidth: 6, borderLeftColor: colors.primary, elevation: 3 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>
                      {item.name || item.nome}
                    </Text>
                    <Text style={{ color: colors.text, opacity: 0.6, marginTop: 4 }}>
                      👤 {item.membros?.length || 0} / 8 Membros
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={{ backgroundColor: colors.primary + '15', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8 }}
                    onPress={() => navigation.navigate('CriarPatrulha', { patrulha: item })}
                  >
                    <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Editar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}