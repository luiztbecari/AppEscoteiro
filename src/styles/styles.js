import { StyleSheet, Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent:'center',
    alignItems:'center',
    padding: 20,
    backgroundColor: '#f5f5dc',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#006400',
  },
  input: {
    borderWidth: 1,
    borderColor: '#006400',
    borderRadius: 5,
    padding: 10,
    width: screenWidth * 0.8,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#228B22',
    padding: 12,
    borderRadius: 5,
    width: screenWidth * 0.8, 
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});