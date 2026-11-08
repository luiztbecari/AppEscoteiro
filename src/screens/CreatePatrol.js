import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Modal, Platform, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OURO_DETALHE = '#DAA520';
const VERDE_SKILL = '#2E8B57';
const MOSTRAR_BOTAO_ATIVIDADE = false;

const calcularIdadeApartirDeData = (dataNascimento) => {
  if (!dataNascimento) return '--';
  
  try {
    const dataNasc = new Date(dataNascimento);
    if (isNaN(dataNasc.getTime())) return '--';
    
    const hoje = new Date();
    let idadeCalculada = hoje.getFullYear() - dataNasc.getFullYear();
    const diferencaMeses = hoje.getMonth() - dataNasc.getMonth();
    
    if (diferencaMeses < 0 || (diferencaMeses === 0 && hoje.getDate() < dataNasc.getDate())) {
      idadeCalculada--;
    }
    
    return idadeCalculada >= 0 ? idadeCalculada : '--';
  } catch (error) {
    console.error("Erro ao converter data de nascimento:", error);
    return '--';
  }
};

// Pega as iniciais do nome para o avatar (ex: "João Silva" -> "JS")
const obterIniciais = (nome) => {
  if (!nome) return '?';
  const partes = nome.trim().split(' ').filter(Boolean);
  if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
  return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
};

export default function CreatePatrol({ route, navigation }) {
  const { colors } = useContext(ThemeContext);
  const patrulhaEdit = route.params?.patrulha;
  const isEditing = !!patrulhaEdit;
  const chefeLogado = route.params?.user;

  const [nome, setNome] = useState('');
  const [membros, setMembros] = useState([]);
  const [listaJovens, setListaJovens] = useState([]);
  const [loadingJovens, setLoadingJovens] = useState(false);
  const [loadingML, setLoadingML] = useState(false); 
  const [loadingAtividade, setLoadingAtividade] = useState(false); 
  const [saving, setSaving] = useState(false); 
  
  const [modalVisible, setModalVisible] = useState(false);
  const [buscaJovem, setBuscaJovem] = useState('');
  
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  const [alertType, setAlertType] = useState('success');

  const [modalAtividadeVisible, setModalAtividadeVisible] = useState(false);
  const [atividadeRecomendada, setAtividadeRecomendada] = useState(null);

  const BASE_URL = 'https://grupo-escoteiro.onrender.com';
  const ML_URL = 'https://mlrender-8jl0.onrender.com'; 

  useEffect(() => {
    const inicializarTela = async () => {
      setNome('');
      setMembros([]);
      
      console.log("🔄 [PASSO 1] Buscando lista global de jovens...");
      const jovensCarregados = await carregarJovens();
      
      console.log(`📊 [PASSO 2] Total de jovens carregados: ${jovensCarregados?.length || 0}`);

      if (patrulhaEdit) {
        setNome(patrulhaEdit.name || patrulhaEdit.nome || '');
        
        const membrosVindosDoServidor = patrulhaEdit.membros || patrulhaEdit.members || [];
        
        const membrosCompletos = membrosVindosDoServidor.map((membro) => {
          if (typeof membro === 'object' && membro !== null) {
            return {
              ...membro,
              idade: calcularIdadeApartirDeData(membro.date_of_birth || membro.date_of_birthday)
            };
          }
          
          const idMembroServidor = membro ? membro.toString().trim() : '';
          const jovemEncontrado = jovensCarregados.find(j => {
            const idJovemLista = (j.id || j._id || '').toString().trim();
            return idJovemLista === idMembroServidor;
          });
          
          if (jovemEncontrado) {
            const dataNasc = jovemEncontrado.date_of_birth || jovemEncontrado.date_of_birthday;
            return {
              id: jovemEncontrado.id || jovemEncontrado._id,
              name: jovemEncontrado.nome || jovemEncontrado.name,
              idade: calcularIdadeApartirDeData(dataNasc),
              skill_fisico: jovemEncontrado.skill_fisico,
              skill_tecnico: jovemEncontrado.skill_tecnico,
              skill_experiencia: jovemEncontrado.skill_experiencia
            };
          }
          
          return { id: membro, name: `ID Não Localizado (${membro})`, idade: '--' };
        });

        setMembros(membrosCompletos);
      }
    };

    const unsubscribe = navigation.addListener('focus', () => {
      inicializarTela();
    });

    return unsubscribe;
  }, [navigation, patrulhaEdit]); 

  const carregarJovens = async () => {
    setLoadingJovens(true);
    try {
      const tokenChefe = await AsyncStorage.getItem('@token_chefe');
      const storageBranchId = await AsyncStorage.getItem('@branch_id');
      
      const rawBranchId = storageBranchId || 
                          chefeLogado?.branch_id || 
                          chefeLogado?.user?.branch_id || 
                          patrulhaEdit?.branch_id;
      
      const response = await fetch(`${BASE_URL}/members`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenChefe}`
        }
      });

      if (!response.ok) {
        setListaJovens([]);
        return [];
      }
      
      const data = await response.json();
      const listaCompleta = Array.isArray(data) ? data : (data.members || data.data || []);
      
      if (rawBranchId !== undefined && rawBranchId !== null) {
        const branchIdStr = rawBranchId.toString().trim();
        
        console.log("=========================================");
        console.log(`👤 Chefe Logado no Ramo ID: "${branchIdStr}"`);
        console.log("📋 Amostra de jovens vindos do banco de dados:");
        listaCompleta.slice(0, 3).forEach((j, i) => {
          console.log(`   [Jovem ${i+1}] Nome: ${j.nome || j.name} | branch_id do banco: ${j.branch_id} | branch_name do banco: "${j.branch_name}"`);
        });
        console.log("=========================================");

        let termosDoRamo = [];
        if (branchIdStr === "1") {
          termosDoRamo = ["escoteiro", "escoteira"];
        } else if (branchIdStr === "2") {
          termosDoRamo = ["alcateia", "lobinho", "lobinha"];
        } else if (branchIdStr === "3") {
          termosDoRamo = ["sênior", "senior", "guia"];
        } else if (branchIdStr === "4") {
          termosDoRamo = ["pioneiro", "pioneira"];
        }

        const listaFiltrada = listaCompleta.filter(jovem => {
          if (branchIdStr === "0") return true;

          const jovemBranchId = jovem.branch_id ? jovem.branch_id.toString().trim() : null;
          const nomeJovemRamoNoBanco = jovem.branch_name ? jovem.branch_name.toLowerCase() : "";

          if (jovemBranchId && jovemBranchId === branchIdStr) {
            return true;
          }
          
          if (nomeJovemRamoNoBanco && termosDoRamo.length > 0) {
            return termosDoRamo.some(termo => nomeJovemRamoNoBanco.includes(termo));
          }
          
          return false;
        });

        const listaNormalizada = listaFiltrada.map(jovem => ({
          ...jovem,
          branch_id: branchIdStr 
        }));

        console.log(`🎯 Filtro aplicado para Ramo ${branchIdStr}: Retornou ${listaNormalizada.length} membros.`);
        setListaJovens(listaNormalizada);
        return listaNormalizada;
      }

      setListaJovens(listaCompleta);
      return listaCompleta;

    } catch (error) {
      console.error("⚠️ Erro de rede ao buscar jovens:", error);
      setListaJovens([]);
      return [];
    } finally {
      setLoadingJovens(false);
    }
  };

  const showCustomAlert = (msg, type = 'error') => {
    setAlertMsg(msg);
    setAlertType(type);
    setAlertVisible(true);
  };

  const confirmarBalanceamento = () => {
    if (!listaJovens || listaJovens.length === 0) {
      showCustomAlert("Não há dados de jovens carregados para submeter ao modelo de ML.", 'error');
      return;
    }
    showCustomAlert("Esta é uma sugestão inteligente de balanceamento para equilibrar as equipes com base nas habilidades dos jovens. Deseja balancear a patrulha agora?", 'ml');
  };

  const confirmarSalvamento = () => {
    if (!nome.trim()) { 
      showCustomAlert('Por favor, dê um nome à patrulha.', 'error'); 
      return; 
    }
    showCustomAlert(isEditing ? "Deseja salvar as alterações desta patrulha?" : "Deseja criar esta nova patrulha?", 'save');
  };

// Troque a função handleCallMLBalancer do CreatePatrol.js por esta
const handleCallMLBalancer = async () => {
  setLoadingML(true);

  // cancela se o servidor demorar mais de 90 segundos
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);

  try {
    const tokenChefe = await AsyncStorage.getItem('@token_chefe');
    const storageBranchId = await AsyncStorage.getItem('@branch_id');
    const rawBranchId = storageBranchId || chefeLogado?.branch_id || chefeLogado?.user?.branch_id;
    const branchIdAtual = rawBranchId ? rawBranchId.toString().trim() : null;

    if (!branchIdAtual) {
      showCustomAlert("Não foi possível identificar o ramo.", 'error');
      return;
    }

    const jovensSemPatrulha = listaJovens?.filter(lj => !lj.patrol_id && !lj.patrulha_id) || [];
    const totalJovensValidos = jovensSemPatrulha.length > 0 ? jovensSemPatrulha.length : (listaJovens?.length || 0);
    const qtdGruposCalculada = Math.max(1, Math.ceil(totalJovensValidos / 8));

    const response = await fetch(`${BASE_URL}/patrols/balancear`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenChefe}`
      },
      body: JSON.stringify({
        branch_id: branchIdAtual,
        quantidade_grupos: qtdGruposCalculada
      })
    });

    const textData = await response.text();

    if (!response.ok) {
      let mensagem = `Erro ${response.status}`;
      try {
        const errorObj = JSON.parse(textData);
        mensagem = errorObj.error || errorObj.message || mensagem;
        if (errorObj.details) {
          mensagem += ` (${typeof errorObj.details === 'string' ? errorObj.details : JSON.stringify(errorObj.details)})`;
        }
      } catch {
        if (textData) mensagem = `Erro ${response.status}: ${textData}`;
      }
      throw new Error(mensagem);
    }

    const data = JSON.parse(textData);
    console.log("Dados do servidor:", JSON.stringify(data, null, 2));

    let jovensSugeridos = [];
    if (Array.isArray(data.resultado)) {
      jovensSugeridos = data.resultado;
    } else if (data.resultado && Array.isArray(data.resultado.membros)) {
      jovensSugeridos = data.resultado.membros;
    } else if (Array.isArray(data.membros)) {
      jovensSugeridos = data.membros;
    }

    if (jovensSugeridos.length === 0) {
      throw new Error("O servidor retornou sucesso, mas a lista de membros está vazia.");
    }

    // Se vier em grupos, usa só o primeiro grupo; se vier lista simples, usa até 8
    let membrosDaPatrulha = [];
    if (jovensSugeridos[0] && Array.isArray(jovensSugeridos[0].membros)) {
      membrosDaPatrulha = jovensSugeridos[0].membros;
    } else {
      membrosDaPatrulha = jovensSugeridos.slice(0, 8);
    }

    const patrulhaMontadaPelaIA = membrosDaPatrulha.slice(0, 8).map(jovemIA => {
      const idOriginal = String(jovemIA.id || jovemIA._id).trim();

      const correspondenteLocal = listaJovens.find(lj =>
        String(lj.id || lj._id).trim() === idOriginal
      );

      return {
        id: idOriginal,
        name: correspondenteLocal?.nome || correspondenteLocal?.name || jovemIA.name || "Jovem",
        idade: correspondenteLocal ? calcularIdadeApartirDeData(correspondenteLocal.date_of_birth || correspondenteLocal.date_of_birthday) : '--',
        skill_fisico: jovemIA.skill_fisico ?? jovemIA.fisico ?? correspondenteLocal?.skill_fisico ?? 1,
        skill_tecnico: jovemIA.skill_tecnico ?? jovemIA.tecnico ?? correspondenteLocal?.skill_tecnico ?? 1,
        skill_experiencia: jovemIA.skill_experiencia ?? jovemIA.experiencia ?? correspondenteLocal?.skill_experiencia ?? 1
      };
    });

    setMembros(patrulhaMontadaPelaIA);
    showCustomAlert(`Sucesso! Patrulha otimizada com ${patrulhaMontadaPelaIA.length} membros.`, 'success');

  } catch (error) {
    console.error("[ML ERROR]:", error);
    if (error.name === 'AbortError') {
      showCustomAlert("O servidor demorou demais para responder. Tente novamente em 1 minuto.", 'error');
    } else {
      showCustomAlert(error.message, 'error');
    }
  } finally {
    clearTimeout(timer);
    setLoadingML(false);
  }
};

  const handleRecomendarAtividade = async () => {
    if (!membros || membros.length === 0) {
      showCustomAlert("Por favor, adicione pelo menos um membro na patrulha para gerar uma recomendação.", 'error');
      return;
    }

    setLoadingAtividade(true);
    try {
      const storageBranchId = await AsyncStorage.getItem('@branch_id');
      const rawBranchId = storageBranchId || chefeLogado?.branch_id || chefeLogado?.user?.branch_id;
      const branchIdAtual = rawBranchId ? rawBranchId.toString().trim() : "Geral";

      let nomeRamo = "Geral";
      if (branchIdAtual === "1") nomeRamo = "Escoteiro";
      else if (branchIdAtual === "2") nomeRamo = "Lobinho";
      else if (branchIdAtual === "3") nomeRamo = "Sênior";
      else if (branchIdAtual === "4") nomeRamo = "Pioneiro";

      const payloadAtividade = {
        membros: membros.map(m => ({
          id: m.id || m._id,
          nome: m.name || m.nome || "Membro",
          skill_fisico: Number(m.skill_fisico) || 1,
          skill_tecnico: Number(m.skill_tecnico) || 1,
          skill_experiencia: Number(m.skill_experiencia) || 1,
          ramo: nomeRamo 
        })),
        limite_por_grupo: 8
      };

      console.log("🚀 Enviando dados para geração de atividades com IA...");

      const response = await fetch(`${ML_URL}/atividades`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadAtividade) 
      });

      if (!response.ok) {
        const txtErro = await response.text();
        throw new Error(`Status ${response.status} - ${txtErro}`);
      }

      const dataAtividade = await response.json();
      console.log("🎯 Resposta da IA recebida:", dataAtividade);

      if (dataAtividade.grupos && dataAtividade.grupos.length > 0) {
        const primeiroGrupoIA = dataAtividade.grupos[0];
        const primeiraAtividade = primeiroGrupoIA.atividades[0];

        setAtividadeRecomendada({
          nome: primeiraAtividade?.nome || 'Atividade Sugerida',
          ramo: primeiroGrupoIA.perfil_do_grupo || nomeRamo,
          descricao: `Objetivo: ${primeiraAtividade?.objetivo}\n\nDuração: ${primeiraAtividade?.duracao}\n\nComo Executar:\n${primeiraAtividade?.como_executar?.join('\n')}`
        });
        
        setModalAtividadeVisible(true);
      } else if (dataAtividade.erro) {
        throw new Error(dataAtividade.erro);
      } else {
        throw new Error("Formato de resposta inesperado da IA.");
      }

    } catch (error) {
      console.error("❌ [ML ACTIVITY ERROR]:", error);
      showCustomAlert(`Não foi possível buscar a recomendação: ${error.message}`, 'error');
    } finally {
      setLoadingAtividade(false);
    }
  };

  const selecionarJovem = (jovem) => {
    if (membros.length >= 8) {
      showCustomAlert("Limite de 8 membros atingido por patrulha.", 'error');
      return;
    }
    
    const idJovem = jovem.id || jovem._id;
    const nomeJovem = jovem.nome || jovem.name; 
    const dataNascimentoDoBanco = jovem.date_of_birth || jovem.date_of_birthday;
    const idadeJovem = calcularIdadeApartirDeData(dataNascimentoDoBanco);

    const jaExiste = membros.some(m => (typeof m === 'object' && m !== null) ? (m.id || m._id) === idJovem : m === idJovem);

    if (jaExiste) {
      showCustomAlert("Este jovem já foi adicionado a esta patrulha.", 'error');
      return;
    }
    
    setMembros(membrosAtuais => [...membrosAtuais, { 
      id: idJovem, 
      name: nomeJovem, 
      idade: idadeJovem,
      skill_fisico: jovem.skill_fisico,
      skill_tecnico: jovem.skill_tecnico,
      skill_experiencia: jovem.skill_experiencia
    }]);
    setModalVisible(false);
  };

  const excluirPatrulha = async () => {
    try {
      const tokenChefe = await AsyncStorage.getItem('@token_chefe');
      const idPatrulha = patrulhaEdit?.id || patrulhaEdit?._id;

      if (!idPatrulha) throw new Error("ID da patrulha não encontrado.");
      
      const response = await fetch(`${BASE_URL}/patrols/${idPatrulha}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${tokenChefe}` }
      });

      if (response.ok) {
        setAlertVisible(false);
        navigation.goBack();
      } else {
        throw new Error("Erro ao deletar no servidor.");
      }
    } catch (error) {
      showCustomAlert(error.message, 'error');
    }
  };

  const salvar = async () => {
    setSaving(true);
    try {
      const tokenChefe = await AsyncStorage.getItem('@token_chefe');
      const storageBranchId = await AsyncStorage.getItem('@branch_id');
      const rawBranchId = storageBranchId || chefeLogado?.branch_id || chefeLogado?.user?.branch_id || patrulhaEdit?.branch_id || 1;
      const branchId = Number(rawBranchId);

      if (!isEditing) {
        const getPatrolsResponse = await fetch(`${BASE_URL}/patrols`, {
          method: 'GET',
          headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${tokenChefe}` }
        });

        if (getPatrolsResponse.ok) {
          const patrolsData = await getPatrolsResponse.json();
          const listaPatrulhasGeral = Array.isArray(patrolsData) ? patrolsData : (patrolsData.patrols || patrolsData.data || []);
          const patrulhasDoRamo = listaPatrulhasGeral.filter(p => p.branch_id && Number(p.branch_id) === branchId);

          if (patrulhasDoRamo.length >= 4) {
            showCustomAlert("Limite atingido! Cada ramo pode ter no máximo 4 patrulhas registradas.", 'error');
            setSaving(false);
            return;
          }
        }
      }

      const membrosIds = membros.map(m => (typeof m === 'object' && m !== null) ? m.id || m._id : m).filter(Boolean);
      const idPatrulha = patrulhaEdit?.id || patrulhaEdit?._id;
      let url = isEditing ? `${BASE_URL}/patrols/${idPatrulha}` : `${BASE_URL}/patrols`;

      const payload = {
        name: nome,
        branch_id: branchId, 
        membros: membrosIds,
        members: membrosIds,
        status: patrulhaEdit?.status || (membrosIds.length > 0 ? 'ativa' : 'desativada')
      };

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${tokenChefe}`
        },
        body: JSON.stringify(payload),
      });
      
      if (response.ok) {
        navigation.goBack();
      } else {
        const textoErro = await response.text();
        throw new Error(textoErro || `Erro ${response.status}`);
      }
    } catch (error) { 
      showCustomAlert(`Erro ao salvar: ${error.message}`, 'error'); 
    } finally {
      setSaving(false);
    }
  };

  const renderSkillsBadges = (membro) => {
    if (!membro || (membro.skill_fisico === undefined && membro.skill_tecnico === undefined && membro.skill_experiencia === undefined)) {
      return (
        <View style={styles.miniBadgeSkill}>
          <Text style={[styles.miniSkillText, { color: colors.text, opacity: 0.6 }]}>Sem perícias registradas</Text>
        </View>
      );
    }

    const fis = membro.skill_fisico ?? '--';
    const tec = membro.skill_tecnico ?? '--';
    const exp = membro.skill_experiencia ?? '--';

    return (
      <>
        <View style={styles.miniBadgeSkill}>
          <Ionicons name="fitness" size={11} color={VERDE_SKILL} style={{ marginRight: 2 }} />
          <Text style={[styles.miniSkillText, { color: colors.text }]}>
            Fís: <Text style={{ fontWeight: 'bold', color: VERDE_SKILL }}>{fis}</Text>
          </Text>
        </View>
        <View style={styles.miniBadgeSkill}>
          <Ionicons name="build" size={11} color={VERDE_SKILL} style={{ marginRight: 2 }} />
          <Text style={[styles.miniSkillText, { color: colors.text }]}>
            Téc: <Text style={{ fontWeight: 'bold', color: VERDE_SKILL }}>{tec}</Text>
          </Text>
        </View>
        <View style={styles.miniBadgeSkill}>
          <Ionicons name="ribbon" size={11} color={VERDE_SKILL} style={{ marginRight: 2 }} />
          <Text style={[styles.miniSkillText, { color: colors.text }]}>
            Exp: <Text style={{ fontWeight: 'bold', color: VERDE_SKILL }}>{exp}</Text>
          </Text>
        </View>
      </>
    );
  };

  const getAlertConfig = () => {
    switch (alertType) {
      case 'delete': return { icon: "alert-circle", color: "#FF4444", title: "Confirmar Exclusão", isConfirm: true, btnText: "SIM, EXCLUIR", action: excluirPatrulha };
      case 'save': return { icon: "help-circle-outline", color: colors.primary, title: "Confirmar", isConfirm: true, btnText: "SIM, SALVAR", action: salvar };
      case 'ml': return { icon: "shuffle-outline", color: colors.primary, title: "Sugestão de Balanceamento", isConfirm: true, btnText: "SIM, BALANCEAR", action: handleCallMLBalancer };
      case 'error': return { icon: "close-circle", color: "#D32F2F", title: "Atenção", isConfirm: false, btnText: "ENTENDIDO", action: () => setAlertVisible(false) };
      case 'success': default: return { icon: "checkmark-circle", color: "#1A4524", title: "Sucesso!", isConfirm: false, btnText: "ENTENDIDO", action: () => setAlertVisible(false) };
    }
  };

  const alertConfig = getAlertConfig();

  // Lista de jovens filtrada pelo campo de busca do modal de seleção
  const jovensFiltrados = (listaJovens || []).filter(jovem => {
    if (!jovem) return false;
    const nomeJovem = (jovem.nome || jovem.name || '').toLowerCase();
    return nomeJovem.includes(buscaJovem.trim().toLowerCase());
  });

  const abrirModalSelecao = () => {
    setBuscaJovem('');
    setModalVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.text }]}>Nome da Patrulha</Text>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
          value={nome}
          onChangeText={setNome}
          placeholder="Ex: Patrulha Touro"
          placeholderTextColor={colors.border}
        />
        
        {isEditing && patrulhaEdit?.status && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <View style={{ 
              width: 10, 
              height: 10, 
              borderRadius: 5, 
              backgroundColor: patrulhaEdit.status === 'ativa' ? '#4CD964' : '#FF3B30',
              marginRight: 6 
            }} />
            <Text style={{ color: colors.text, fontSize: 13, textTransform: 'capitalize' }}>
              Patrulha {patrulhaEdit.status}
            </Text>
          </View>
        )}

        <View style={styles.headerMembros}>
          <Text style={[styles.label, { color: colors.text }]}>Membros ({membros?.length || 0}/8)</Text>
          <View style={{ flexDirection: 'row' }}>
            
            <TouchableOpacity 
              onPress={confirmarBalanceamento} 
              disabled={loadingML}
              style={[styles.btnBalancear, { borderColor: colors.primary, marginRight: 10 }]}
            >
              {loadingML ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 5 }} />
              ) : (
                <Ionicons name="shuffle-outline" size={18} color={colors.primary} style={{ marginRight: 5 }} />
              )}
              <Text style={[styles.btnBalancearText, { color: colors.primary }]}>
                {loadingML ? "Processando..." : "Balancear"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={abrirModalSelecao} style={[styles.btnAdd, { backgroundColor: colors.primary }]}>
              <Text style={styles.btnAddText}>+ Adicionar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <FlatList
        data={membros || []}
        keyExtractor={(item, index) => (item && typeof item === 'object') ? (item.id || item._id || index).toString() : index.toString()}
        renderItem={({ item, index }) => {
          if (!item) return null;
          const nomeExibir = typeof item === 'object' ? (item.name || item.nome) : `Membro #${index + 1}`;
          const idadeValor = typeof item === 'object' ? item.idade : '--';
          const idadeExibir = (idadeValor && idadeValor !== '--') ? `${idadeValor} anos` : 'Idade não informada';

          return (
            <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16 }}>{nomeExibir}</Text>
                <Text style={{ color: colors.border, fontSize: 12, marginBottom: 4 }}>{idadeExibir}</Text>
                <View style={styles.containerSkillsRow}>
                  {renderSkillsBadges(item)}
                </View>
              </View>
              <TouchableOpacity onPress={() => setMembros(membros.filter((_, i) => i !== index))}>
                <Ionicons name="trash-outline" size={22} color="#FF4444" />
              </TouchableOpacity>
            </View>
          );
        }}
      />

      <View style={styles.stickyFooter}>
        {MOSTRAR_BOTAO_ATIVIDADE && (
          <TouchableOpacity 
            style={[styles.btnAtividade, { borderColor: OURO_DETALHE, marginBottom: 12 }]} 
            onPress={handleRecomendarAtividade}
            disabled={loadingAtividade}
          >
            {loadingAtividade ? (
              <ActivityIndicator size="small" color={OURO_DETALHE} />
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color={OURO_DETALHE} style={{ marginRight: 8 }} />
                <Text style={[styles.btnAtividadeText, { color: OURO_DETALHE }]}>SUGERIR ATIVIDADE DA IA</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={[styles.btnSave, { backgroundColor: colors.primary }]} 
          onPress={confirmarSalvamento} 
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.btnSaveText}>{isEditing ? "SALVAR ALTERAÇÕES" : "CRIAR PATRULHA"}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal de seleção de jovens — redesenhado com busca, avatares e cabeçalho fixo */}
      <Modal visible={modalVisible} animationType="fade" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Selecionar Jovem</Text>
                <Text style={[styles.modalSubtitle, { color: colors.border }]}>
                  {loadingJovens
                    ? 'Carregando lista...'
                    : `${jovensFiltrados.length} de ${listaJovens.length} disponíveis`}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.btnFecharX, { backgroundColor: colors.background }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBox, { backgroundColor: colors.background, borderColor: colors.border + '50' }]}>
              <Ionicons name="search" size={18} color={colors.border} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Buscar pelo nome..."
                placeholderTextColor={colors.border}
                value={buscaJovem}
                onChangeText={setBuscaJovem}
                autoCorrect={false}
              />
              {buscaJovem.length > 0 && (
                <TouchableOpacity onPress={() => setBuscaJovem('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={18} color={colors.border} />
                </TouchableOpacity>
              )}
            </View>
            
            {loadingJovens ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 30 }} />
            ) : (
              <FlatList
                data={jovensFiltrados}
                keyExtractor={(item) => (item.id || item._id).toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 10 }}
                renderItem={({ item }) => {
                  if (!item) return null;
                  const dataNascimento = item.date_of_birth || item.date_of_birthday;
                  const itemIdade = calcularIdadeApartirDeData(dataNascimento);
                  const nomeItem = item.nome || item.name;

                  return (
                    <TouchableOpacity
                      style={[styles.jovemItem, { backgroundColor: colors.background, borderColor: colors.border + '30' }]}
                      onPress={() => selecionarJovem(item)}
                      activeOpacity={0.6}
                    >
                      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                        <Text style={styles.avatarText}>{obterIniciais(nomeItem)}</Text>
                      </View>

                      <View style={{ flex: 1, paddingHorizontal: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                          <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold', marginRight: 8 }} numberOfLines={1}>
                            {nomeItem}
                          </Text>
                          {itemIdade !== '--' && (
                            <View style={[styles.pillIdade, { backgroundColor: colors.card }]}>
                              <Text style={{ color: colors.text, fontSize: 11, fontWeight: '600' }}>{itemIdade} anos</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.containerSkillsRow}>
                          {renderSkillsBadges(item)}
                        </View>
                      </View>

                      <Ionicons name="add-circle" size={26} color={colors.primary} />
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons name={buscaJovem ? "search-outline" : "people-outline"} size={38} color={colors.border} />
                    <Text style={{ color: colors.text, textAlign: 'center', marginTop: 10, opacity: 0.6 }}>
                      {buscaJovem
                        ? `Nenhum jovem encontrado para "${buscaJovem}"`
                        : 'Nenhum jovem disponível no servidor.'}
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={modalAtividadeVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.atividadeContent, { backgroundColor: colors.card }]}>
            <View style={styles.atividadeHeaderIcon}>
              <Ionicons name="bulb" size={40} color="#FFF" /> 
            </View>
            <Text style={styles.tagIA}>RECOMENDAÇÃO INTELIGENTE</Text>
            <Text style={[styles.atividadeTitulo, { color: colors.text }]}>
              {atividadeRecomendada?.nome}
            </Text>
            <View style={[styles.badgeRamoContainer, { backgroundColor: colors.border + '30' }]}>
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: 'bold' }}>
                Ramo: {atividadeRecomendada?.ramo}
              </Text>
            </View>
            <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
              <Text style={[styles.atividadeDescricao, { color: colors.text }]}>
                {atividadeRecomendada?.descricao}
              </Text>
            </ScrollView>
            <TouchableOpacity 
              onPress={() => setModalAtividadeVisible(false)} 
              style={[styles.btnOkAtividade, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.btnOkText}>ENTENDIDO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={alertVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.alertContent, { backgroundColor: colors.card }]}>
            
            <View style={{ marginBottom: 15 }}>
              <Ionicons name={alertConfig.icon} size={60} color={alertConfig.color} />
            </View>

            <Text style={[styles.alertTitle, { color: colors.text }]}>
              {alertConfig.title}
            </Text>
            
            <Text style={[styles.alertText, { color: colors.text }]}>{alertMsg}</Text>
            
            <View style={{ width: '100%' }}>
              <TouchableOpacity 
                onPress={() => {
                  setAlertVisible(false);
                  if (alertConfig.action) {
                    setTimeout(() => alertConfig.action(), 100); 
                  }
                }} 
                style={[styles.btnOk, { backgroundColor: alertConfig.color }]}
              >
                <Text style={styles.btnOkText}>
                  {alertConfig.btnText}
                </Text>
              </TouchableOpacity>
              
              {alertConfig.isConfirm && (
                <TouchableOpacity 
                  onPress={() => setAlertVisible(false)} 
                  style={[styles.btnCancelarAlert, { borderColor: colors.border }]}
                >
                  <Text style={[styles.btnCancelarAlertText, { color: colors.text }]}>CANCELAR</Text>
                </TouchableOpacity>
              )}
            </View>

          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 15 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  input: { height: 48, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, marginBottom: 15, fontSize: 16 },
  headerMembros: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10 },
  btnBalancear: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 12, height: 36, borderRadius: 18 },
  btnBalancearText: { fontSize: 13, fontWeight: '700' },
  btnAdd: { paddingHorizontal: 14, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  btnAddText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  item: { flexDirection: 'row', padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 10, alignItems: 'center' },
  containerSkillsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  miniBadgeSkill: { flexDirection: 'row', alignItems: 'center', marginRight: 12, marginTop: 4 },
  miniSkillText: { fontSize: 11 },
  stickyFooter: { paddingVertical: 12, borderTopWidth: 0.5, borderColor: '#ccc' },
  btnAtividade: { height: 48, borderRadius: 8, borderWidth: 1.5, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  btnAtividadeText: { fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
  btnSave: { height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  btnSaveText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxHeight: '82%', borderRadius: 16, padding: 20, paddingTop: 10 },

  // ── Cabeçalho e busca do modal de seleção de jovens ──────────────────────
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', opacity: 0.4, marginBottom: 14 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalSubtitle: { fontSize: 12, marginTop: 2 },
  btnFecharX: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, height: 42, marginBottom: 14 },
  searchInput: { flex: 1, fontSize: 15, height: '100%' },

  jovemItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  pillIdade: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },

  atividadeContent: { width: '100%', height: '75%', borderRadius: 16, padding: 20, alignItems: 'center' },
  atividadeHeaderIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: OURO_DETALHE, justifyContent: 'center', alignItems: 'center', marginTop: -45, elevation: 5 },
  tagIA: { fontSize: 11, fontWeight: 'bold', color: OURO_DETALHE, marginTop: 12, letterSpacing: 1 },
  atividadeTitulo: { fontSize: 22, fontWeight: 'bold', marginVertical: 10, textAlign: 'center' },
  badgeRamoContainer: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 10 },
  scrollArea: { flex: 1, width: '100%', marginVertical: 10 },
  atividadeDescricao: { fontSize: 15, lineHeight: 22, textAlign: 'center', paddingHorizontal: 10 },
  btnOkAtividade: { width: '100%', height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  btnOkText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  alertContent: { width: '85%', borderRadius: 14, padding: 22, alignItems: 'center', elevation: 10 },
  alertTitle: { fontSize: 19, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  alertText: { fontSize: 14, textAlign: 'center', marginBottom: 22, lineHeight: 20, opacity: 0.8 },
  btnOk: { width: '100%', height: 46, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  btnCancelarAlert: { width: '100%', height: 46, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  btnCancelarAlertText: { fontWeight: '700', fontSize: 14 }
});