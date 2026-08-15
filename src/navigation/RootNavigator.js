import React from 'react';
import { View, Text, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutGrid,
  Users,
  ShoppingBag,
  TrendingUp,
  User,
  HandCoins,
  Folder
} from 'lucide-react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';

import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

/* ---------------- SCREENS ---------------- */

import LoginScreen from '../screens/LoginScreen';
import SplashScreen from '../screens/SplashScreen';

import SignupScreen from '../screens/SignupScreen';
import RegisterFlowScreen from '../screens/RegisterFlowScreen';
import VerifyOtpScreen from '../screens/VerifyOtpScreen';
import ForgotPinScreen from '../screens/ForgotPinScreen';
import ResetPinScreen from '../screens/ResetPinScreen';

import OnboardingScreen from '../screens/OnboardingScreen';

import DashboardScreen from '../screens/DashboardScreen';
import CustomersScreen from '../screens/CustomersScreen';
import AddCustomerScreen from '../screens/AddCustomerScreen';

import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import InvoicePreviewScreen from '../screens/InvoicePreviewScreen';

import AnalyticsScreen from '../screens/AnalyticsScreen';
import SettingsScreen from '../screens/SettingsScreen';

import CreateOrderScreen from '../screens/CreateOrderScreen';
import SalesOrderScreen from '../screens/SalesOrderScreen';
// import CreateOrderFlowScreen from '../screens/CreateOrderFlowScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import PaymentDetailScreen from '../screens/PaymentDetailScreen';

// import EditCategoryScreen from '../screens/EditCategoryScreen';
import ItemDetailScreen from '../screens/ItemDetailScreen';

import EditBusinessProfileScreen from '../screens/EditBusinessProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import AboutScreen from '../screens/AboutScreen';
import OrdersListScreen from '../screens/OrdersListScreen';
import TermsScreen from '../screens/TermsScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import FaqScreen from '../screens/FaqScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import DeleteAccountScreen from '../screens/DeleteAccountScreen';
import TailorDashboardScreen from '../screens/TailorDashboardScreen';

import CustomerDashboardScreen from '../screens/CustomerDashboardScreen';
import CustomerOrderDetailScreen from '../screens/CustomerOrderDetailScreen';
import CustomerRequestedOrdersScreen from '../screens/CustomerRequestedOrdersScreen';
import CustomerGalleryScreen from '../screens/CustomerGalleryScreen';
import CustomerShopScreen from '../screens/CustomerShopScreen';
import CustomerProfileScreen from '../screens/CustomerProfileScreen';

/* ---------------- STACKS ---------------- */

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const CustomerTab = createBottomTabNavigator();
const CustomerStack = createNativeStackNavigator();
const OrderStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

/* ---------------- CUSTOMER TABS ---------------- */

function CustomerTabs() {
  const insets = useSafeAreaInsets();
  return (
    <CustomerTab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#1E293B',
          borderTopWidth: 1,
          borderTopColor: '#334155',
          height: Platform.OS === 'ios'
            ? 70 + (insets.bottom > 0 ? insets.bottom : 10)
            : 74 + (insets.bottom > 0 ? insets.bottom : 18),
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios'
            ? (insets.bottom > 0 ? insets.bottom : 10)
            : (insets.bottom > 0 ? insets.bottom : 18),
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter-Medium',
          fontSize: 13,
          marginTop: 2,
        },
        headerShown: false
      }}
    >
      <CustomerTab.Screen
        name="CustomerDashboard"
        component={CustomerDashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIcon, focused && styles.activeTab]}>
              <LayoutGrid size={22} color={focused ? '#FFF' : color} />
            </View>
          ),
        }}
      />
      <CustomerTab.Screen
        name="CustomerGallery"
        component={CustomerGalleryScreen}
        options={{
          tabBarLabel: 'Gallery',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIcon, focused && styles.activeTab]}>
              <Folder size={22} color={focused ? '#FFF' : color} />
            </View>
          ),
        }}
      />
      <CustomerTab.Screen
        name="CustomerShop"
        component={CustomerShopScreen}
        options={{
          tabBarLabel: 'Shop',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIcon, focused && styles.activeTab]}>
              <ShoppingBag size={22} color={focused ? '#FFF' : color} />
            </View>
          ),
        }}
      />
      <CustomerTab.Screen
        name="CustomerProfile"
        component={CustomerProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIcon, focused && styles.activeTab]}>
              <User size={22} color={focused ? '#FFF' : color} />
            </View>
          ),
        }}
      />
    </CustomerTab.Navigator>
  );
}

/* ---------------- AUTH NAV ---------------- */

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Splash" component={SplashScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={RegisterFlowScreen} />
      <AuthStack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
      <AuthStack.Screen name="ForgotPin" component={ForgotPinScreen} />
      <AuthStack.Screen name="ResetPin" component={ResetPinScreen} />
      <AuthStack.Screen name="Termsscreen" component={TermsScreen} />
      <AuthStack.Screen name="PrivacyPolicyScreen" component={PrivacyPolicyScreen} />
    </AuthStack.Navigator>
  );
}

/* ---------------- CUSTOMER NAV ---------------- */

function CustomerNavigator() {
  return (
    <CustomerStack.Navigator>
      {/* <CustomerStack.Screen
        name="CustomerList"
        component={CustomersScreen}
        options={{ headerShown: false }}
      /> */}
      <CustomerStack.Screen
        name="Customers"
        component={CustomersScreen}
        options={{ headerShown: false }}
      />
    </CustomerStack.Navigator>
  );
}

/* ---------------- ORDER NAV ---------------- */

function OrderNavigator() {
  return (
    <OrderStack.Navigator screenOptions={{
      headerStyle: { backgroundColor: Colors.white },
      headerTitleStyle: { fontFamily: 'Inter-SemiBold', fontSize: 18 }
    }}>
      <OrderStack.Screen name="OrderList" component={OrdersListScreen} options={{ headerShown: false, title: 'Orders' }} />
    </OrderStack.Navigator>
  );
}

/* ---------------- MAIN TABS ---------------- */

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { user, hasPermission } = useAuth();
  const canViewInsights = hasPermission?.('Insights', 'view') ?? true;
  const isTailor = user?.role === 'Tailor';
  const isCustomer = user?.role === 'Customer';

  if (isCustomer) {
    return <CustomerTabs />;
  }

  if (isTailor) {
    return (
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#FFFFFF',
          tabBarInactiveTintColor: '#94A3B8',
          tabBarStyle: {
            backgroundColor: '#1E293B',
            borderTopWidth: 1,
            borderTopColor: '#334155',
            height: Platform.OS === 'ios'
              ? 70 + (insets.bottom > 0 ? insets.bottom : 10)
              : 74 + (insets.bottom > 0 ? insets.bottom : 18),
            paddingTop: 8,
            paddingBottom: Platform.OS === 'ios'
              ? (insets.bottom > 0 ? insets.bottom : 10)
              : (insets.bottom > 0 ? insets.bottom : 18),
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          },
          tabBarLabelStyle: {
            fontFamily: 'Inter-Medium',
            fontSize: 13,
            marginTop: 2,
          },
          headerShown: false
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={TailorDashboardScreen}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.tabIcon, focused && styles.activeTab]}>
                <LayoutGrid size={22} color={focused ? '#FFF' : color} />
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.tabIcon, focused && styles.activeTab]}>
                <User size={24} color={focused ? '#FFF' : color} strokeWidth={focused ? 2.5 : 2} />
              </View>
            ),
          }}
        />
      </Tab.Navigator>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#1E293B',
          borderTopWidth: 1,
          borderTopColor: '#334155',
          height: Platform.OS === 'ios'
            ? 70 + (insets.bottom > 0 ? insets.bottom : 10)
            : 74 + (insets.bottom > 0 ? insets.bottom : 18),
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios'
            ? (insets.bottom > 0 ? insets.bottom : 10)
            : (insets.bottom > 0 ? insets.bottom : 18),
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter-Medium',
          fontSize: 13,
          marginTop: 2,
        },
        headerShown: false
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIcon, focused && styles.activeTab]}>
              <LayoutGrid size={22} color={focused ? '#FFF' : color} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Customers"
        component={CustomerNavigator}
        options={{
          tabBarLabel: 'Customers',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIcon, focused && styles.activeTab]}>
              <Users size={24} color={focused ? '#FFF' : color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Orders"
        component={OrderNavigator}
        options={{
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIcon, focused && styles.activeTab]}>
              <ShoppingBag size={24} color={focused ? '#FFF' : color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Payments"
        component={PaymentsScreen}
        options={{
          tabBarLabel: 'Payments',
          tabBarButton: canViewInsights ? undefined : () => null,
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIcon, focused && styles.activeTab]}>
              <HandCoins size={24} color={focused ? '#FFF' : color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIcon, focused && styles.activeTab]}>
              <User size={24} color={focused ? '#FFF' : color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

/* ---------------- ROOT NAV ---------------- */

export default function RootNavigator() {
  const { userToken, isOnboarded } = useAuth();

  // if (loading) {
  //   return (
  //     <View style={styles.loader}>
  //       <ActivityIndicator size="large" color={Colors.primary} />
  //     </View>
  //   );
  // }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>


      {!userToken ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : (
        <>
          {!isOnboarded && (
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          )}
          {/* <Stack.Screen name="InventoryScreen" component={InventoryScreen} options={{ headerShown: false }} /> */}

          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="CustomerRequestedOrders" component={CustomerRequestedOrdersScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CustomerOrderDetail" component={CustomerOrderDetailScreen} options={{ headerShown: false }} />
          {/* <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ headerShown: true, title: 'Client Details' }} /> */}
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ headerShown: false, }} />
          <Stack.Screen name="InvoicePreview" component={InvoicePreviewScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CreateOrder" component={CreateOrderScreen} options={{ headerShown: true, title: 'New Order' }} />
          <Stack.Screen name="SalesOrder" component={SalesOrderScreen} options={{ headerShown: false }} />
          {/* <Stack.Screen name="CreateOrderFlow" component={CreateOrderFlowScreen} options={{ headerShown: false, title: 'Create New Order' }} /> */}
          <Stack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ headerShown: false }} />
          {/* <Stack.Screen name="EditCategory" component={EditCategoryScreen} options={{ headerShown: false }} /> */}

          {/* <Stack.Screen name="Payments" component={PaymentsScreen} options={{ headerShown: true, title: 'Payments' }} /> */}
          <Stack.Screen name="PaymentDetail" component={PaymentDetailScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ headerShown: true }} />
          <Stack.Screen name="AddCustomerScreen" component={AddCustomerScreen} />
          {/* Settings Screens */}
          <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
          <Stack.Screen name="EditBusinessProfile" component={EditBusinessProfileScreen} options={{ headerShown: false }} />
          <Stack.Screen name="HelpSupport" component={HelpSupportScreen} options={{ headerShown: false }} />
          <Stack.Screen name="About" component={AboutScreen} options={{ headerShown: false }} />

          <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="DeleteAccountScreen" component={DeleteAccountScreen} options={{ headerShown: false }} />
        </>
      )}
      <Stack.Screen name="Termsscreen" component={TermsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PrivacyPolicyScreen" component={PrivacyPolicyScreen} options={{ headerShown: false }} />
      <Stack.Screen name="FaqScreen" component={FaqScreen} options={{ headerShown: false }} />

    </Stack.Navigator>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  tabIcon: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
    minHeight: 30,
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
