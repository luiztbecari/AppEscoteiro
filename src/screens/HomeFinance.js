// import React, { useState, useCallback, useEffect } from 'react';
// import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { useFocusEffect } from '@react-navigation/native';

// export default function HomeFinance({ navigation, route }) {
//   const [loading, setLoading] = useState(true);
//   const [todasMovimentacoes, setTodasMovimentacoes] = useState([]); 
//   const [resumo, setResumo] = useState({ saldo: 0, receitas: 0, despesas: 0 });
//   const [movimentacoesFiltradas, setMovimentacoesFiltradas] = useState([]);
//   const [dadosPorRamo, setDadosPorRamo] = useState({});
//   const [ramoSelecionado, setRamoSelecionado] = useState('todos'); 
  
//   const [cargoExibido, setCargoExibido] = useState("Chefe");

//   const listaRamos = [
//     { id: 'todos', name: 'Geral (Grupo)' },
//     { id: 1, name: 'Lobinho' }, 
//     { id: 2, name: 'Escoteiro' },  
//     { id: 3, name: 'Sênior' }
//   ];

//   const usuario = route.params?.user;

//   useEffect(() => {
//     const carregarCargoUsuario = async () => {
//       try {
//         const token = await AsyncStorage.getItem('@token_chefe');
//         const userId = usuario?.id || usuario?.user?.id;
//         let cargoVerificado = null;

//         if (userId && token) {
//           try {
//             const userResponse = await fetch(`https://grupo-escoteiro.onrender.com/users/${userId}`, {
//               method: 'GET',
//               headers: {
//                 'Accept': 'application/json',
//                 'Authorization': `Bearer ${token}`
//               }
//             });

//             if (userResponse.ok) {
//               const userData = await userResponse.json();
//               cargoVerificado = userData.role || userData.global_role || userData.cargo;
//             }
//           } catch (userApiErr) {
//             console.log("Erro ao buscar cargo na home, tentando fallbacks:", userApiErr);
//           }
//         }

//         if (!cargoVerificado && usuario) {
//           cargoVerificado = usuario.role || usuario.global_role || usuario.cargo;
//         }
//         if (!cargoVerificado) {
//           cargoVerificado = await AsyncStorage.getItem('@user_role');
//         }

//         if (cargoVerificado) {
//           const cargoLimpo = cargoVerificado.trim().toLowerCase();
          
//           if (cargoLimpo === 'admin' || cargoLimpo === 'administrador' || cargoLimpo === 'presidente') {
//             setCargoExibido("Presidente");
//           } else if (cargoLimpo === 'financeiro') {
//             setCargoExibido("Financeiro");
//           } else {
//             setCargoExibido(cargoVerificado.trim().charAt(0).toUpperCase() + cargoVerificado.trim().slice(1).toLowerCase());
//           }
//         } else {
//           setCargoExibido("Chefe de Seção");
//         }
//       } catch (err) {
//         console.log("Erro ao processar cargo na HomeFinance:", err);
//         setCargoExibido("Chefe");
//       }
//     };

//     carregarCargoUsuario();
//   }, [usuario]);

//   const buscarDadosFinanceiros = async () => {
//     try {
//       setLoading(true);
//       const token = await AsyncStorage.getItem('@token_chefe');
//       const timestamp = new Date().getTime();
//       const urlComTimestamp = `https://grupo-escoteiro.onrender.com/finances?_nocache=${timestamp}`;

//       const response = await fetch(urlComTimestamp, {
//         method: 'GET',
//         headers: { 
//           'Authorization': `Bearer ${token}`,
//           'Accept': 'application/json',
//           'Cache-Control': 'no-cache, no-store, must-revalidate',
//           'Pragma': 'no-cache',
//           'Expires': '0'
//         }
//       });
      
//       if (response.ok) {
//         const dados = await response.json();
//         if (Array.isArray(dados)) {
//           setTodasMovimentacoes(dados); 
//         } else {
//           setTodasMovimentacoes([]);
//         }
//       } else {
//         setTodasMovimentacoes([]);
//       }
//     } catch (error) {
//       console.log("Erro ao carregar resumo financeiro:", error);
//       setTodasMovimentacoes([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useFocusEffect(
//     useCallback(() => {
//       buscarDadosFinanceiros();
//       return () => {
//         setLoading(true);
//       };
//     }, [navigation])
//   );

//   useEffect(() => {
//     let rec = 0;
//     let desp = 0;
//     const filtradas = [];
    
//     const ramosAcumulador = {
//       1: { name: 'Escoteiro', saldo: 0 },
//       2: { name: 'Lobinho', saldo: 0 },
//       3: { name: 'Sênior', saldo: 0 }
//     };

//     if (Array.isArray(todasMovimentacoes)) {
//       todasMovimentacoes.forEach(item => {
//         if (!item) return;

//         const rawBranchId = item.branch_id ?? item.branchId ?? null;
//         const itemIdRamo = rawBranchId !== null ? Number(rawBranchId) : null;
//         const nomeDoRamoDoItem = item.branch_name ? String(item.branch_name).toLowerCase().trim() : '';
//         const valor = Number(item.amount || item.value || item.valor || item.transaction_amount || 0);
//         const tipoLimpo = String(item.type || item.tipo || item.transaction_type || '').toLowerCase().trim();
//         const isReceita = tipoLimpo === 'receita' || tipoLimpo === 'entrada';

//         let idRamoResolvido = itemIdRamo;
//         if (!idRamoResolvido) {
//           if (nomeDoRamoDoItem.includes('escot')) idRamoResolvido = 1;
//           else if (nomeDoRamoDoItem.includes('lob') || nomeDoRamoDoItem.includes('wolf')) idRamoResolvido = 2;
//           else if (nomeDoRamoDoItem.includes('sen') || nomeDoRamoDoItem.includes('sên')) idRamoResolvido = 3;
//         }

//         if (idRamoResolvido && ramosAcumulador[idRamoResolvido]) {
//           if (isReceita) {
//             ramosAcumulador[idRamoResolvido].saldo += valor;
//           } else {
//             ramosAcumulador[idRamoResolvido].saldo -= valor;
//           }
//         }

//         let deveComputar = false;
//         if (ramoSelecionado === 'todos') {
//           deveComputar = true;
//         } else {
//           const filtroIdNum = Number(ramoSelecionado);
//           if (idRamoResolvido !== null && idRamoResolvido === filtroIdNum) {
//             deveComputar = true;
//           }
//         }

//         if (deveComputar) {
//           filtradas.push(item);
//           if (isReceita) {
//             rec += valor;
//           } else {
//             desp += valor;
//           }
//         }
//       });
//     }

//     setResumo({ receitas: rec, despesas: desp, saldo: rec - desp });
//     setMovimentacoesFiltradas(filtradas);
//     setDadosPorRamo(ramosAcumulador);
//   }, [ramoSelecionado, todasMovimentacoes]);

//   if (loading) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator size="large" color="#006400" />
//         <Text style={styles.loadingText}>Carregando painel financeiro...</Text>
//       </View>
//     );
//   }

// return (
//     <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }}>
//       <View style={styles.welcomeContainer}>
//         <Text style={styles.title}>Olá, {cargoExibido}</Text>
//         <Text style={styles.subtitle}>Confira a saúde financeira dos Grupos Escoteiros</Text>
//       </View>

//       <View style={styles.filterSection}>
//         <Text style={styles.filterTitle}>Visualizar Caixa por Ramo:</Text>
//         <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollFiltros} contentContainerStyle={styles.scrollContent}>
//           {listaRamos.map((ramo) => (
//             <TouchableOpacity
//               key={ramo.id}
//               style={[styles.filtroBotao, ramoSelecionado === ramo.id && styles.filtroBotaoAtivo]}
//               onPress={() => setRamoSelecionado(ramo.id)}
//             >
//               <Text style={[styles.filtroTexto, ramoSelecionado === ramo.id && styles.filtroTextoAtivo]}>
//                 {ramo.name}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </ScrollView>
//       </View>

//       <View style={[styles.cardSaldo, resumo.saldo >= 0 ? styles.fundoVerde : styles.fundoVermelhoEscuro]}>
//         <View style={styles.cardHeaderRow}>
//           <Text style={styles.labelSaldo}>
//             SALDO EM CAIXA - {listaRamos.find(r => r.id === ramoSelecionado)?.name.toUpperCase()}
//           </Text>
//           <View style={styles.badgeStatus}>
//             <Text style={styles.badgeText}>{resumo.saldo >= 0 ? 'POSITIVO' : 'NEGATIVO'}</Text>
//           </View>
//         </View>
//         <Text style={styles.valorSaldo}>R$ {resumo.saldo.toFixed(2)}</Text>
//         <Ionicons name="analytics-outline" size={80} color="rgba(255,255,255,0.08)" style={styles.iconFundo} />
//       </View>

//       <View style={styles.row}>
//         <View style={[styles.cardMetrica, styles.bordaVerde]}>
//           <View style={styles.headerMetrica}>
//             <Ionicons name="arrow-up-circle" size={20} color="#4CD964" />
//             <Text style={styles.labelMetrica}>Receitas</Text>
//           </View>
//           <Text style={[styles.valorMetrica, { color: '#4CD964' }]}>R$ {resumo.receitas.toFixed(2)}</Text>
//         </View>

//         <View style={[styles.cardMetrica, styles.bordaVermelha]}>
//           <View style={styles.headerMetrica}>
//             <Ionicons name="arrow-down-circle" size={20} color="#FF3B30" />
//             <Text style={styles.labelMetrica}>Despesas</Text>
//           </View>
//           <Text style={[styles.valorMetrica, { color: '#FF3B30' }]}>R$ {resumo.despesas.toFixed(2)}</Text>
//         </View>
//       </View>

//       <TouchableOpacity 
//         style={styles.botaoVerTodos} 
//         onPress={() => navigation.navigate('ManageFinances')} 
//         activeOpacity={0.7}
//       >
//         <Text style={styles.textoBotaoVerTodos}>Ver Todos os Registros</Text>
//         <Ionicons name="arrow-forward-outline" size={18} color="#006400" />
//       </TouchableOpacity>

//       <View style={styles.secaoInformativa}>
//         <Text style={styles.sectionTitle}>Últimas Atividades</Text>
//         {movimentacoesFiltradas.length === 0 ? (
//           <View style={styles.cardVazio}>
//             <Text style={styles.txtVazio}>Nenhum lançamento recente neste ramo.</Text>
//           </View>
//         ) : (
//           movimentacoesFiltradas.slice(0, 3).map((item, index) => {
//             const valor = parseFloat(item.amount || item.value || item.valor || 0);
//             const tipo = String(item.type || item.tipo || '').toLowerCase();
//             const ehReceita = tipo === 'receita' || tipo === 'entrada';
            
//             return (
//               <View key={item.id || index} style={styles.miniItemExtrato}>
//                 <View style={styles.extratoEsquerda}>
//                   <View style={[styles.circuloIcone, { backgroundColor: ehReceita ? '#E8F5E9' : '#FFEBEE' }]}>
//                     <Ionicons 
//                       name={ehReceita ? 'add-circle-outline' : 'remove-circle-outline'} 
//                       size={18} 
//                       color={ehReceita ? '#4CD964' : '#FF3B30'} 
//                     />
//                   </View>
//                   <View style={{ marginLeft: 10, flex: 1 }}>
//                     <Text style={styles.miniDesc} numberOfLines={1}>{item.description || 'Lançamento sem descrição'}</Text>
//                     <Text style={styles.miniRamo}>{item.branch_name || listaRamos.find(r => r.id === item.branch_id)?.name || 'Geral'}</Text>
//                   </View>
//                 </View>
//                 <Text style={[styles.miniValor, { color: ehReceita ? '#2e7d32' : '#c62828' }]}>
//                   {ehReceita ? '+' : '-'} R$ {valor.toFixed(2)}
//                 </Text>
//               </View>
//             );
//           })
//         )}
//       </View>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#f5f5dc', padding: 20 },
//   center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5dc' },
//   loadingText: { marginTop: 10, color: '#006400', fontWeight: '500' },
//   welcomeContainer: { marginBottom: 20, marginTop: 10 },
//   title: { fontSize: 24, fontWeight: 'bold', color: '#006400' },
//   subtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  
//   filterSection: { marginBottom: 15 },
//   filterTitle: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 8 },
//   scrollFiltros: { flexDirection: 'row' },
  
//   scrollContent: {
//     flexGrow: 1,
//     justifyContent: 'center',
//     alignItems: 'center'
//   },
  
//   filtroBotao: { backgroundColor: '#FFF', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#DDD', justifyContent: 'center', height: 36 },
//   filtroBotaoAtivo: { backgroundColor: '#006400', borderColor: '#006400' },
//   filtroTexto: { color: '#555', fontWeight: '500', fontSize: 12 },
//   filtroTextoAtivo: { color: '#FFF', fontWeight: 'bold' },
//   cardSaldo: { borderRadius: 15, padding: 20, marginBottom: 15, position: 'relative', overflow: 'hidden', elevation: 3 },
//   fundoVerde: { backgroundColor: '#006400' },
//   fundoVermelhoEscuro: { backgroundColor: '#5c1414' },
//   cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
//   badgeStatus: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
//   badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
//   labelSaldo: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
//   valorSaldo: { color: '#FFF', fontSize: 30, fontWeight: 'bold', marginTop: 5 },
//   iconFundo: { position: 'absolute', right: -15, bottom: -15 },
//   row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
//   cardMetrica: { flex: 0.48, backgroundColor: '#FFF', borderRadius: 12, padding: 12, elevation: 1 },
//   bordaVerde: { borderLeftWidth: 4, borderLeftColor: '#4CD964' },
//   bordaVermelha: { borderLeftWidth: 4, borderLeftColor: '#FF3B30' },
//   headerMetrica: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
//   labelMetrica: { fontSize: 12, color: '#666', marginLeft: 6, fontWeight: '500' },
//   valorMetrica: { fontSize: 16, fontWeight: 'bold' },
//   secaoInformativa: { marginBottom: 20 },
//   sectionTitle: { fontSize: 15, fontWeight: '700', color: '#006400', marginBottom: 10 },
//   containerRamosDistribuição: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, elevation: 1 },
//   linhaRamoInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#F0F0F0' },
//   ramoNomeContainer: { flexDirection: 'row', alignItems: 'center' },
//   txtRamoNome: { fontSize: 14, color: '#333', marginLeft: 8, fontWeight: '500' },
//   txtRamoSaldo: { fontSize: 14, fontWeight: 'bold' },
//   cardVazio: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, alignItems: 'center' },
//   txtVazio: { color: '#999', fontSize: 13 },
//   miniItemExtrato: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 8, elevation: 1 },
//   extratoEsquerda: { flexDirection: 'row', alignItems: 'center', flex: 0.75 },
//   circuloIcone: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
//   miniDesc: { fontSize: 13, fontWeight: '600', color: '#333' },
//   miniRamo: { fontSize: 11, color: '#777', marginTop: 1 },
//   miniValor: { fontSize: 13, fontWeight: 'bold', flex: 0.25, textAlign: 'right' },
//   botaoVerTodos: {
//     flexDirection: 'row',
//     backgroundColor: '#FFF',
//     borderRadius: 12,
//     padding: 16,
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 20,
//     elevation: 1,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.1,
//     shadowRadius: 2,
//     borderWidth: 1,
//     borderColor: '#E0E0E0'
//   },
//   textoBotaoVerTodos: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#006400'
//   },
// });