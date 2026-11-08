// import React, { useState, useContext, useCallback, useEffect } from 'react';
// import { 
//   View, 
//   Text, 
//   TouchableOpacity, 
//   FlatList, 
//   ActivityIndicator, 
//   TextInput, 
//   Modal, 
//   StyleSheet, 
//   Platform,
//   KeyboardAvoidingView,
//   Keyboard,
//   TouchableWithoutFeedback,
//   ScrollView
// } from 'react-native';
// import { useFocusEffect } from '@react-navigation/native';
// import { ThemeContext } from '../context/ThemeContext';
// import { styles as globalStyles } from '../styles/styles'; 
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { Ionicons } from '@expo/vector-icons';

// export default function ManageFinances({ route, navigation }) {
//   const { colors } = useContext(ThemeContext);
  
//   const chefeLogado = route.params?.user; 

//   console.log("🔒 [DEBUG SEGURANÇA] Dados recebidos na rota:", JSON.stringify(chefeLogado));

//   const cargoDaRota = chefeLogado?.global_role || chefeLogado?.user?.global_role || chefeLogado?.role || '';
//   const role = String(cargoDaRota).toUpperCase().trim();
//   const nomeDoUsuario = String(chefeLogado?.name || chefeLogado?.nome || chefeLogado?.user?.name || '').toLowerCase().trim();

//   const temAcessoGeral = chefeLogado === undefined ? true : (
//     role === 'ADMIN' || 
//     role === 'FINANCEIRO' || 
//     role === 'PRESIDENTE' || 
//     nomeDoUsuario === 'luis'
//   );

//   const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '', onClose: null });
//   const [confirmAlert, setConfirmAlert] = useState({ visible: false, title: '', message: '', onConfirm: null });

//   const exibirAlerta = (titulo, mensagem, onClose = null) => {
//     setCustomAlert({ visible: true, title: titulo, message: mensagem, onClose });
//   };

//   const [transacoes, setTransacoes] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState('');
//   const [saldoTotal, setSaldoTotal] = useState(0);
  
//   const [modalVisible, setModalVisible] = useState(false);
//   const [descricao, setDescricao] = useState('');
//   const [valor, setValor] = useState('');
//   const [tipo, setTipo] = useState('receita'); 
  
//   const branchIdPadrao = chefeLogado?.branch_id || chefeLogado?.user?.branch_id || 1;
  
//   const [ramoVisualizando, setRamoVisualizando] = useState('todos'); 
//   const [ramoSelecionado, setRamoSelecionado] = useState(branchIdPadrao);
//   const [isSaving, setIsSaving] = useState(false);
//   const ramosDisponiveis = [
//     { id: 1, nome: 'Lobinho' },
//     { id: 2, nome: 'Escoteiro' },
//     { id: 3, nome: 'Sênior' },
//   ];

//   const BASE_URL = 'https://grupo-escoteiro.onrender.com';
//   const userId = chefeLogado?.id || chefeLogado?.user?.id;

//   useEffect(() => {
//     if (chefeLogado !== undefined && !temAcessoGeral) {
//       exibirAlerta(
//         "Acesso Negado", 
//         "Esta página é exclusiva para o Presidente e Diretoria Financeira.",
//         () => navigation.goBack()
//       );
//     }
//   }, [temAcessoGeral, chefeLogado, navigation]);

//   const carregarFinancas = async () => {
//     if (!temAcessoGeral) return;

//     try {
//       setLoading(true);
//       const tokenChefe = await AsyncStorage.getItem('@token_chefe');
      
//       const urlFinal = ramoVisualizando === 'todos'
//         ? `${BASE_URL}/finances`
//         : `${BASE_URL}/finances/branch/${ramoVisualizando}`;

//       console.log(`🔗 [DEBUG] Requisitando Filtro: ${ramoVisualizando} -> URL: ${urlFinal}`);

//       const response = await fetch(urlFinal, {
//         method: 'GET',
//         headers: {
//           'Accept': 'application/json',
//           'Authorization': `Bearer ${tokenChefe}`
//         }
//       });

//       if (response.status === 403) {
//         const erro403 = await response.json();
//         exibirAlerta("Acesso Negado", erro403.message || "Você não tem permissão para acessar esta rota.");
//         setTransacoes([]);
//         return;
//       }

//       if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
      
//       const data = await response.json();
//       setTransacoes(data);
//       calcularSaldo(data);

//     } catch (error) {
//       console.error("Erro ao carregar finanças:", error);
//       exibirAlerta("Erro", "Não foi possível carregar o extrato financeiro.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useFocusEffect(
//     useCallback(() => {
//       carregarFinancas();
//     }, [ramoVisualizando, temAcessoGeral])
//   );

//   const calcularSaldo = (lista) => {
//     let total = 0;
//     if (Array.isArray(lista)) {
//       lista.forEach(item => {
//         const valorNum = Number(item.amount || item.value || item.valor || 0);
//         const tipoLimpo = String(item.type || item.tipo || '').toLowerCase().trim();
        
//         if (tipoLimpo === 'receita' || tipoLimpo === 'entrada') {
//           total += valorNum;
//         } else {
//           total -= valorNum;
//         }
//       });
//     }
//     setSaldoTotal(total);
//   };

//   const lancarMovimentacao = async () => {
//     Keyboard.dismiss();

//     if (!descricao.trim() || !valor.trim()) {
//       exibirAlerta("Atenção", "Preencha todos os campos corretamente.");
//       return;
//     }

//     try {
//       const tokenChefe = await AsyncStorage.getItem('@token_chefe');
//       const valorLimpo = valor.replace(/\./g, '').replace(',', '.');
//       const valorNum = Number(valorLimpo);

//       if (isNaN(valorNum) || valorNum <= 0) {
//         exibirAlerta("Atenção", "Insira um valor numérico válido maior que zero.");
//         return;
//       }

//       const ramoDados = ramosDisponiveis.find(r => r.id === Number(ramoSelecionado));

//       const payload = {
//         description: descricao.trim(),
//         amount: valorNum,
//         type: tipo,
//         transaction_date: new Date().toISOString().split('T')[0],
//         branch_id: Number(ramoSelecionado), 
//         user_id: userId ? Number(userId) : null
//       };

//       const response = await fetch(`${BASE_URL}/finances`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'Accept': 'application/json',
//           'Authorization': `Bearer ${tokenChefe}`
//         },
//         body: JSON.stringify(payload)
//       });

//       if (response.ok) {
//         exibirAlerta("Sucesso", `Movimentação destinada ao Ramo ${ramoDados?.nome || ''} salva!`);
//         setModalVisible(false);
//         setDescricao('');
//         setValor('');
        
//         setRamoVisualizando(Number(ramoSelecionado)); 
//         carregarFinancas();
//       } else {
//         const txtErro = await response.text();
//         let msgAmigavel = "Verifique as permissões do seu usuário.";
//         try {
//           const jsonErro = JSON.parse(txtErro);
//           msgAmigavel = jsonErro.message || msgAmigavel;
//         } catch {
//           if (txtErro) msgAmigavel = txtErro;
//         }
//         exibirAlerta("Erro ao Salvar", msgAmigavel);
//       }
//     } catch (error) {
//       console.error("Erro na requisição POST:", error);
//       exibirAlerta("Erro de Conexão", "Não foi possível alcançar o servidor financeiro.");
//     }
//   };

//   const executarExclusaoApi = async (id, token) => {
//     try {
//       const response = await fetch(`${BASE_URL}/finances/${id}`, {
//         method: 'DELETE',
//         headers: { 'Authorization': `Bearer ${token}` }
//       });

//       if (response.ok) {
//         exibirAlerta("Sucesso", "Registro financeiro removido com sucesso!");
//         carregarFinancas();
//       } else {
//         const erroTxt = await response.json();
//         exibirAlerta("Erro", erroTxt.message || erroTxt.error || "Não foi possível remover o registro.");
//       }
//     } catch (error) {
//       console.error(error);
//       exibirAlerta("Erro", "Falha de comunicação com o servidor.");
//     }
//   };

//   const estornarTransacao = async (item) => {
//     const tokenChefe = await AsyncStorage.getItem('@token_chefe');
    
//     setConfirmAlert({
//       visible: true,
//       title: "Confirmar Exclusão",
//       message: "Deseja realmente deletar permanentemente este registro financeiro?",
//       onConfirm: () => executarExclusaoApi(item.id, tokenChefe)
//     });
//   };

//   const formatarMoeda = (num) => {
//     return 'R$ ' + Number(num).toFixed(2).replace('.', ',');
//   };

//   const filteredTransacoes = transacoes.filter(t => {
//     const desc = t.description || '';
//     return desc.toLowerCase().includes(search.toLowerCase());
//   });

//   return (
//     <View style={{ flex: 1, backgroundColor: colors.background }}>
      
//       {temAcessoGeral && (
//         <View style={{ flex: 1, padding: 20 }}>
//           <Text style={[globalStyles.title, { color: colors.primary, marginBottom: 5, fontSize: 24, fontWeight: 'bold' }]}>
//             Painel Financeiro
//           </Text>
//           <Text style={{ color: colors.text, opacity: 0.6, marginBottom: 15, fontSize: 14 }}>
//             Controle Geral da Diretoria
//           </Text>

//           <View style={styles.filterSection}>
//             <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollFiltros} contentContainerStyle={styles.scrollContent}>
//               <TouchableOpacity style={[styles.botaoFiltro, ramoVisualizando === 'todos' && styles.botaoFiltroAtivo]} onPress={() => setRamoVisualizando('todos')}>
//                 <Text style={[styles.textoFiltro, ramoVisualizando === 'todos' && styles.textoFiltroAtivo]}>Geral</Text>
//               </TouchableOpacity>
              
//               {ramosDisponiveis.map((r) => (
//                 <TouchableOpacity key={r.id} style={[styles.botaoFiltro, ramoVisualizando === r.id && styles.botaoFiltroAtivo]} onPress={() => setRamoVisualizando(r.id)}>
//                   <Text style={[styles.textoFiltro, ramoVisualizando === r.id && styles.textoFiltroAtivo]}>{r.nome}</Text>
//                 </TouchableOpacity>
//               ))}
//             </ScrollView>
//           </View>

//           <View style={[styles.cardSaldo, { backgroundColor: colors.card, borderColor: colors.border }]}>
//             <Text style={{ color: colors.text, opacity: 0.7, fontSize: 14, fontWeight: '600' }}>
//               Saldo ({ramoVisualizando === 'todos' ? 'Caixa Geral' : ramosDisponiveis.find(r => r.id === ramoVisualizando)?.nome})
//             </Text>
//             <Text style={[styles.textoSaldo, { color: saldoTotal >= 0 ? '#4CD964' : '#FF3B30' }]}>
//               {formatarMoeda(saldoTotal)}
//             </Text>
//           </View>

//           <TextInput
//             style={[styles.inputBusca, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, borderWidth: 1 }]}
//             placeholder="Filtrar por histórico..."
//             placeholderTextColor={colors.text + '60'}
//             value={search}
//             onChangeText={setSearch}
//           />

//           <TouchableOpacity
//             style={[styles.botaoNovoRegistro, { backgroundColor: colors.primary }]}
//             onPress={() => {
//               setRamoSelecionado(branchIdPadrao);
//               setDescricao('');
//               setValor('');
//               setTipo('receita');
//               setModalVisible(true);
//             }}
//           >
//             <Ionicons name="add-sharp" size={20} color="#FFF" style={{ marginRight: 6 }} />
//             <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15 }}>Novo Registro</Text>
//           </TouchableOpacity>

//           {loading ? (
//             <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
//           ) : (
//             <FlatList
//               data={filteredTransacoes}
//               keyExtractor={(item) => item.id.toString()}
//               showsVerticalScrollIndicator={false}
//               renderItem={({ item }) => {
//                 const isReceita = String(item.type || item.tipo || '').toLowerCase().trim() === 'receita';
//                 const val = Number(item.amount || item.value || item.valor || 0);
//                 const nomeDoRamoExibicao = item.branch_name || item.branch?.name || ramosDisponiveis.find(r => r.id === Number(item.branch_id || item.branchId))?.nome;

//                 return (
//                   <View style={[styles.itemTransacao, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
//                     <View style={[styles.indicadorTipo, { backgroundColor: isReceita ? '#4CD964' : '#FF3B30' }]} />
//                     <View style={{ flex: 1, paddingLeft: 12 }}>
//                       <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.text }}>{item.description}</Text>
//                       <Text style={{ fontSize: 11, color: colors.text, opacity: 0.4, marginTop: 2 }}>
//                         Por: {item.user_name || 'Sistema'} {nomeDoRamoExibicao ? `• ${nomeDoRamoExibicao}` : ''}
//                       </Text>
//                     </View>
//                     <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
//                       <Text style={{ fontSize: 15, fontWeight: '700', color: isReceita ? '#4CD964' : '#FF3B30' }}>
//                         {isReceita ? '+' : '-'} {formatarMoeda(val)}
//                       </Text>
//                       <Text style={{ fontSize: 10, color: colors.text + '60', marginTop: 2 }}>
//                         {item.transaction_date ? new Date(item.transaction_date).toLocaleDateString('pt-BR') : ''}
//                       </Text>
//                     </View>
//                     <TouchableOpacity onPress={() => estornarTransacao(item)}>
//                       <Ionicons name="trash-outline" size={18} color="#FF4444" style={{ padding: 4 }} />
//                     </TouchableOpacity>
//                   </View>
//                 );
//               }}
//               ListEmptyComponent={<Text style={{ color: colors.text, textAlign: 'center', marginTop: 40, opacity: 0.5 }}>Nenhuma movimentação encontrada.</Text>}
//             />
//           )}
//         </View>
//       )}

//       <Modal 
//         visible={modalVisible} 
//         animationType="fade" 
//         transparent={true} 
//         statusBarTranslucent={true}
//         onRequestClose={() => setModalVisible(false)}
//       >
//         <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setModalVisible(false); }}>
//           <View style={styles.modalOverlay}>
//             <KeyboardAvoidingView 
//               behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
//               style={styles.keyboardContainer}
//             >
//               <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
//                 <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
//                   <View style={{ width: '100%' }}>
                    
//                     <Text style={[styles.modalTitle, { color: colors.text }]}>Nova Movimentação</Text>
                    
//                     <View style={[styles.containerAbas, { backgroundColor: colors.background, borderColor: colors.border }]}>
//                       <TouchableOpacity 
//                         style={[styles.aba, tipo === 'receita' && { backgroundColor: '#4CD96420', borderWidth: 1, borderColor: '#4CD964' }]} 
//                         onPress={() => setTipo('receita')}
//                       >
//                         <Text style={{ color: tipo === 'receita' ? '#4CD964' : colors.text + '80', fontWeight: '700' }}>Entrada / Receita</Text>
//                       </TouchableOpacity>
//                       <TouchableOpacity 
//                         style={[styles.aba, tipo === 'despesa' && { backgroundColor: '#FF3B3020', borderWidth: 1, borderColor: '#FF3B30' }]} 
//                         onPress={() => setTipo('despesa')}
//                       >
//                         <Text style={{ color: tipo === 'despesa' ? '#FF3B30' : colors.text + '80', fontWeight: '700' }}>Saída / Despesa</Text>
//                       </TouchableOpacity>
//                     </View>

//                     <Text style={[styles.labelModal, { color: colors.text + 'B3' }]}>Destinar a qual Ramo?</Text>
//                     <View style={styles.containerRamos}>
//                       {ramosDisponiveis.map((ramo) => {
//                         const ativo = Number(ramoSelecionado) === ramo.id;
//                         return (
//                           <TouchableOpacity 
//                             key={ramo.id} 
//                             style={[styles.btnRamo, { backgroundColor: colors.background, borderColor: colors.border }, ativo && { borderColor: colors.primary, backgroundColor: colors.primary + '15' }]} 
//                             onPress={() => setRamoSelecionado(ramo.id)}
//                           >
//                             <Text style={[styles.txtRamo, { color: colors.text + 'A0' }, ativo && { color: colors.primary, fontWeight: '700' }]}>{ramo.nome}</Text>
//                           </TouchableOpacity>
//                         );
//                       })}
//                     </View>

//                     <Text style={[styles.labelModal, { color: colors.text + 'B3' }]}>{tipo === 'receita' ? 'O que foi arrecadado?' : 'O que foi gasto?'}</Text>
//                     <TextInput
//                       style={[styles.inputModal, { backgroundColor: colors.background, color: colors.text }]}
//                       placeholder={tipo === 'receita' ? 'Ex: Mensalidade...' : 'Ex: Compra...'}
//                       placeholderTextColor={colors.text + '40'}
//                       value={descricao}
//                       onChangeText={setDescricao}
//                     />

//                     <Text style={[styles.labelModal, { color: colors.text + 'B3' }]}>Valor da Transação</Text>
//                     <TextInput
//                       style={[styles.inputModal, { backgroundColor: colors.background, color: colors.text, fontSize: 18, fontWeight: '600' }]}
//                       placeholder="R$ 0,00"
//                       placeholderTextColor={colors.text + '40'}
//                       keyboardType="decimal-pad"
//                       value={valor}
//                       onChangeText={(text) => setValor(text.replace(/[^0-9,]/g, ''))}
//                     />

//                     <View style={styles.containerBotoesModal}>
//                       <TouchableOpacity 
//                         onPress={() => setModalVisible(false)} 
//                         style={styles.btnModalDescartar} 
//                         disabled={isSaving}
//                       >
//                         <Text style={{ color: colors.text, opacity: 0.5, fontWeight: '500', fontSize: 15 }}>Cancelar</Text>
//                       </TouchableOpacity>
//                       <TouchableOpacity 
//                         onPress={async () => {
//                           setIsSaving(true);
//                           await lancarMovimentacao();
//                           setIsSaving(false);
//                         }} 
//                         disabled={isSaving}
//                         style={[styles.btnModalConfirmarMinimalista, { borderColor: tipo === 'receita' ? '#4CD964' : '#FF3B30', opacity: isSaving ? 0.5 : 1 }]}
//                       >
//                         <Text style={{ color: tipo === 'receita' ? '#4CD964' : '#FF3B30', fontWeight: '600', fontSize: 15 }}>
//                           {isSaving ? "Aguarde..." : "Confirmar"}
//                         </Text>
//                       </TouchableOpacity>
//                     </View>

//                   </View>
//                 </TouchableWithoutFeedback>
//               </View>
//             </KeyboardAvoidingView>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>

//       <Modal
//         visible={customAlert.visible}
//         transparent={true}
//         animationType="fade"
//         onRequestClose={() => {
//           setCustomAlert({ ...customAlert, visible: false });
//           if (customAlert.onClose) customAlert.onClose();
//         }}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={[styles.customAlertBox, { backgroundColor: colors.card }]}>
//             <Text style={[styles.customAlertTitle, { color: colors.text }]}>{customAlert.title}</Text>
//             <Text style={[styles.customAlertMessage, { color: colors.text }]}>{customAlert.message}</Text>
//             <TouchableOpacity 
//               style={[styles.customAlertButton, { backgroundColor: colors.primary }]}
//               onPress={() => {
//                 setCustomAlert({ ...customAlert, visible: false });
//                 if (customAlert.onClose) customAlert.onClose();
//               }}
//             >
//               <Text style={styles.customAlertButtonText}>OK</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>

//       <Modal
//         visible={confirmAlert.visible}
//         transparent={true}
//         animationType="fade"
//         onRequestClose={() => setConfirmAlert({ ...confirmAlert, visible: false })}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={[styles.customAlertBox, { backgroundColor: colors.card }]}>
//             <Text style={[styles.customAlertTitle, { color: colors.text }]}>{confirmAlert.title}</Text>
//             <Text style={[styles.customAlertMessage, { color: colors.text }]}>{confirmAlert.message}</Text>
//             <View style={styles.customAlertRow}>
//               <TouchableOpacity 
//                 style={styles.customConfirmCancelButton}
//                 onPress={() => setConfirmAlert({ ...confirmAlert, visible: false })}
//               >
//                 <Text style={[styles.customAlertButtonText, { color: colors.text }]}>Cancelar</Text>
//               </TouchableOpacity>
//               <TouchableOpacity 
//                 style={[styles.customConfirmAcceptButton, { backgroundColor: '#FF3B30' }]}
//                 onPress={() => {
//                   setConfirmAlert({ ...confirmAlert, visible: false });
//                   if (confirmAlert.onConfirm) confirmAlert.onConfirm();
//                 }}
//               >
//                 <Text style={styles.customAlertButtonText}>Sim, Deletar</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </Modal>

//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   filterSection: { marginBottom: 15 },
//   scrollFiltros: { flexDirection: 'row' },
//   scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  
//   botaoFiltro: { 
//     backgroundColor: '#FFF', 
//     paddingHorizontal: 14, 
//     paddingVertical: 6, 
//     borderRadius: 20, 
//     marginRight: 8, 
//     borderWidth: 1, 
//     borderColor: '#DDD', 
//     justifyContent: 'center', 
//     height: 36 
//   },
//   botaoFiltroAtivo: { backgroundColor: '#006400', borderColor: '#006400' },
//   textoFiltro: { color: '#555', fontWeight: '500', fontSize: 12 },
//   textoFiltroAtivo: { color: '#FFF', fontWeight: 'bold' },

//   cardSaldo: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 15, alignItems: 'center' },
//   textoSaldo: { fontSize: 28, fontWeight: '800', marginTop: 4 },
//   inputBusca: { padding: 12, borderRadius: 12, marginBottom: 12 },
//   botaoNovoRegistro: {
//     flexDirection: 'row',
//     height: 50,
//     borderRadius: 12,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: 20,
//     width: '100%',
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 3,
//     elevation: 2,
//   },
//   itemTransacao: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, marginBottom: 10 },
//   indicadorTipo: { width: 4, height: '80%', borderRadius: 2 },
  
//   modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
//   keyboardContainer: { width: '100%', alignItems: 'center', justifyContent: 'center' },
//   modalContent: { width: '92%', maxWidth: 400, borderRadius: 20, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
//   modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  
//   containerAbas: { flexDirection: 'row', marginBottom: 15, borderRadius: 12, padding: 4, borderWidth: 1 },
//   aba: { flex: 1, paddingVertical: 10, justifyContent: 'center', alignItems: 'center', borderRadius: 9 },
//   labelModal: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 10 },
//   containerRamos: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
//   btnRamo: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
//   txtRamo: { fontSize: 12, fontWeight: '500' },
//   inputModal: { height: 50, borderRadius: 12, paddingHorizontal: 16, marginBottom: 4, borderWidth: 0 },
//   containerBotoesModal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, width: '100%' },
//   btnModalDescartar: { flex: 0.45, height: 44, justifyContent: 'center', alignItems: 'center' },
//   btnModalConfirmarMinimalista: { flex: 0.45, height: 44, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },

//   customAlertBox: { width: '85%', maxWidth: 350, padding: 24, borderRadius: 16, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
//   customAlertTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
//   customAlertMessage: { fontSize: 14, textAlign: 'center', marginBottom: 20, opacity: 0.8, lineHeight: 20 },
//   customAlertButton: { width: '100%', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
//   customAlertButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
//   customAlertRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
//   customConfirmCancelButton: { flex: 0.45, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ccc' },
//   customConfirmAcceptButton: { flex: 0.5, paddingVertical: 12, borderRadius: 10, alignItems: 'center' }
// });