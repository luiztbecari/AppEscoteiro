import React, { useContext } from 'react';
import { TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context'; 

import { ThemeProvider, ThemeContext } from './src/context/ThemeContext';

import CriarPatrulha from './src/screens/CreatePatrol';
import Login from './src/screens/Login';
import HomeAdmin from './src/screens/HomeAdmin';
import HomeResponsavel from './src/screens/HomeResponsavel';
import Group from './src/screens/Group';
import Profile from './src/screens/Profile';
import ManageMembers from './src/screens/ManageMembers';
import EditMemberSkills from './src/screens/EditMemberSkills'; 
import HomeFinance from './src/screens/HomeFinance';
import ProfileAdmin from './src/screens/ProfileAdmin';
import Activities from './src/screens/Activities';
import CreateActivity from './src/screens/CreateActivity';

import CreateMember from './src/screens/CreateMember'; 
import CreateLeader from './src/screens/CreateLeader'; 

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const VERDE_ESCOTEIRO = '#1A4524';

const createHeaderOptions = (title, showBackButton, navigation) => ({
  title: title,
  headerStyle: { backgroundColor: VERDE_ESCOTEIRO },
  headerTintColor: '#FFF',
  headerTitleAlign: 'center',
  headerTitle: () => (
    <Image
      source={require('./assets/logo.jpg')}
      style={{ width: 40, height: 40, borderRadius: 20 }}
    />
  ),
  headerLeft: () =>
    showBackButton ? (
      <TouchableOpacity
        onPress={() => {
          if (navigation) {
            navigation.goBack(); 
          }
        }}
        style={{ marginLeft: 15 }}
      >
        <Ionicons name="arrow-back" size={26} color="#FFF" />
      </TouchableOpacity>
    ) : null,
});

const tabScreenOptions = {
  tabBarStyle: { 
    backgroundColor: VERDE_ESCOTEIRO,
    borderTopWidth: 0,
    height: 75,            
    paddingBottom: 15,       
    paddingTop: 8
  },
  tabBarActiveTintColor: '#FFF',
  tabBarInactiveTintColor: '#A0C1A0',
  tabBarLabelStyle: { fontWeight: '700', fontSize: 11 }
};

function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions} backBehavior="history">
      <Tab.Screen 
        name="Home" 
        component={HomeAdmin} 
        options={{
          ...createHeaderOptions('Home', false, null),
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />
        }}
      />
      
      <Tab.Screen 
        name="CriarPatrulha" 
        component={CriarPatrulha} 
        options={({ navigation }) => ({
          ...createHeaderOptions('Criar Patrulha', true, navigation),
          tabBarButton: () => null, 
          tabBarItemStyle: { display: 'none' }, 
        })}
      />

      <Tab.Screen 
        name="Grupos" 
        component={Group} 
        options={({ navigation }) => ({
          ...createHeaderOptions('Grupos', true, navigation),
          tabBarLabel: 'Patrulhas',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />
        })}
      />

      <Tab.Screen 
        name="ManageMembers" 
        component={ManageMembers} 
        options={({ navigation }) => ({
          ...createHeaderOptions('Membros', true, navigation),
          tabBarLabel: 'Membros',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-add" size={size} color={color} />
        })}
      />
      
      <Tab.Screen 
        name="Perfil" 
        component={Profile} 
        options={({ navigation }) => ({
          ...createHeaderOptions('Perfil', true, navigation),
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />
        })}
      />
    </Tab.Navigator>
  );
}

function ResponsavelTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions} backBehavior="history">
      <Tab.Screen 
        name="Home" 
        component={HomeResponsavel} 
        options={{
          ...createHeaderOptions('Home', false, null),
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />
        }}
      />

      <Tab.Screen 
        name="CriarPatrulha" 
        component={CriarPatrulha} 
        options={({ navigation }) => ({
          ...createHeaderOptions('Criar Patrulha', true, navigation),
          tabBarButton: () => null, 
          tabBarItemStyle: { display: 'none' }, 
        })}
      />

      <Tab.Screen 
        name="Grupos" 
        component={Group} 
        options={({ navigation }) => ({
          ...createHeaderOptions('Grupos', true, navigation),
          tabBarLabel: 'Patrulhas',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />
        })}
      />
      
      <Tab.Screen 
        name="Atividades" 
        component={Activities} 
        options={({ navigation }) => ({
          ...createHeaderOptions('Atividades', true, navigation),
          tabBarLabel: 'Atividades',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />
        })}
      />

      <Tab.Screen 
        name="ManageMembers" 
        component={ManageMembers} 
        options={({ navigation }) => ({
          ...createHeaderOptions('Membros', true, navigation),
          tabBarLabel: 'Membros',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-add" size={size} color={color} />
        })}
      />
      
      <Tab.Screen 
        name="Perfil" 
        component={Profile} 
        options={({ navigation }) => ({
          ...createHeaderOptions('Perfil', true, navigation),
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />
        })}
      />
    </Tab.Navigator>
  );
}

function FinanceiroTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions} backBehavior="history">
      <Tab.Screen 
        name="FinancasHome" 
        component={HomeFinance} 
        options={{
          ...createHeaderOptions('Painel Financeiro', false, null),
          tabBarLabel: 'Painel',
          tabBarIcon: ({ color, size }) => <Ionicons name="pie-chart" size={size} color={color} />
        }}
      />
      
      <Tab.Screen 
        name="Perfil" 
        component={Profile} 
        options={({ navigation }) => ({
          ...createHeaderOptions('Perfil', true, navigation),
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />
        })}
      />
    </Tab.Navigator>
  );
}

function Navigation() {
  const { colors, isDark } = useContext(ThemeContext);

  // Tema do React Navigation sincronizado com o tema do app
  // (evita "flash" branco no fundo das telas e nas transições no modo escuro)
  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      {/* Cabeçalho e barra de abas são sempre verde escuro, então os ícones da barra de status ficam claros nos dois temas */}
      <StatusBar style="light" />
      <RootStack.Navigator initialRouteName="Login">
        <RootStack.Screen name="Login" component={Login} options={{ headerShown: false }} />
        <RootStack.Screen name="HomeAdmin" component={AdminTabs} options={{ headerShown: false }} />
        <RootStack.Screen name="HomeResponsavel" component={ResponsavelTabs} options={{ headerShown: false }} />
        
        <RootStack.Screen name="HomeFinanceiro" component={FinanceiroTabs} options={{ headerShown: false }} />
        
        <RootStack.Screen 
          name="ProfileAdmin" 
          component={ProfileAdmin} 
          options={({ navigation }) => ({
            ...createHeaderOptions('Patrulhas do Chefe', true, navigation),
            headerShown: true
          })}
        />

        <RootStack.Screen 
          name="EditMemberSkills" 
          component={EditMemberSkills} 
          options={({ navigation }) => ({
            ...createHeaderOptions('Editar Estatísticas', true, navigation)
          })}
        />

        <RootStack.Screen 
          name="CreateMember" 
          component={CreateMember} 
          options={({ navigation }) => ({
            ...createHeaderOptions('Cadastrar Jovem', true, navigation)
          })}
        />

        <RootStack.Screen 
          name="CreateActivity" 
          component={CreateActivity} 
          options={({ navigation }) => ({
            ...createHeaderOptions('Nova Atividade', true, navigation)
          })}
        />

        <RootStack.Screen 
          name="CreateLeader" 
          component={CreateLeader} 
          options={({ navigation }) => ({
            ...createHeaderOptions('Cadastrar Chefe', true, navigation)
          })}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Navigation />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}