import os

filepath = 'src/screens/CustomerDashboardScreen.js'
with open(filepath, 'r') as f:
    content = f.read()

target = """        {/* ORDERS SECTION */}
        <Text style={styles.sectionTitle}>Your Active Orders</Text>"""

replacement = """        {/* QUICK ACTIONS */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <QuickActionCard
          title="New Stitch Order"
          subtitle="Upload your design and get it stitched."
          cta="Start Order"
          icon={<Scissors size={24} color={Colors.white} />}
          primary={true}
          onPress={() => { /* Navigate to new stitch order flow */ }}
        />
        <QuickActionCard
          title="Shop Ready-made"
          subtitle="Browse dresses from boutiques."
          cta="Shop Now"
          icon={<ShoppingBag size={24} color={Colors.primary} />}
          onPress={() => navigation.navigate('CustomerShop')}
        />
        <QuickActionCard
          title="My Designs"
          subtitle="View saved inspirations and uploaded designs."
          cta="Open Gallery"
          icon={<Camera size={24} color={Colors.primary} />}
          onPress={() => navigation.navigate('CustomerGallery')}
        />

        {/* ORDERS SECTION */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Your Active Orders</Text>"""

if target in content:
    content = content.replace(target, replacement)
    with open(filepath, 'w') as f:
        f.write(content)
    print("Success")
else:
    print("Target not found")
