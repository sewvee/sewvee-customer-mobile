import React, {useState} from "react";
import {View, Text, TouchableOpacity, Modal, StyleSheet} from "react-native";

export default function SubscriptionDetailSheet() {

  const [visible, setVisible] = useState(false);

  return (
    <View style={{flex:1,justifyContent:"center",alignItems:"center"}}>

      <TouchableOpacity
        onPress={() => setVisible(true)}
        style={{backgroundColor:"blue",padding:15}}
      >
        <Text style={{color:"#fff"}}>Open Bottom Sheet</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={{fontSize:18,fontWeight:"bold"}}>
              Bottom Sheet Opened
            </Text>

            <TouchableOpacity
              onPress={() => setVisible(false)}
              style={{marginTop:20}}
            >
              <Text style={{color:"red"}}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({

  overlay:{
    flex:1,
    justifyContent:"flex-end",
    backgroundColor:"rgba(0,0,0,0.4)"
  },

  sheet:{
    backgroundColor:"#fff",
    padding:25,
    borderTopLeftRadius:25,
    borderTopRightRadius:25
  }

});