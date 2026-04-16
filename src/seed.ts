import { supabase } from './supabase';

const SAMPLE_LISTINGS = [
  {
    name: "Milliy Taomlar",
    type: "food",
    address: "Shaykhantakhur district, Tashkent",
    latitude: 41.3265,
    longitude: 69.2285,
    working_hours: "09:00 - 22:00",
    is_active: true,
    is_sponsored: true,
    is_verified: true,
    description: "The most famous Plov center in Tashkent. Authentic taste and huge portions.",
    avg_price: 28000
  },
  {
    name: "Somsa Saroyi",
    type: "food",
    address: "Chilonzor district, Tashkent",
    latitude: 41.2855,
    longitude: 69.2045,
    working_hours: "08:00 - 20:00",
    is_active: true,
    is_sponsored: false,
    is_verified: true,
    description: "Best tandoor somsa in the city. Crispy outside, juicy inside.",
    avg_price: 15000
  },
  {
    name: "Lazzat Lag'mon",
    type: "food",
    address: "Yunusobod district, Tashkent",
    latitude: 41.3545,
    longitude: 69.2845,
    working_hours: "10:00 - 23:00",
    is_active: true,
    is_sponsored: false,
    is_verified: false,
    description: "Hand-pulled noodles with rich meat sauce. A local favorite.",
    avg_price: 32000
  },
  {
    name: "Zara Tashkent",
    type: "clothes",
    address: "Samarqand Darvoza, Tashkent",
    latitude: 41.3145,
    longitude: 69.2245,
    working_hours: "10:00 - 22:00",
    is_active: true,
    is_sponsored: true,
    is_verified: true,
    description: "Latest fashion trends for men, women and children.",
    avg_price: 450000
  }
];

const SAMPLE_REVIEWS = [
  { dish_name: "Osh", price_paid: 35000, rating: 5, title: "Best Plov!", text: "The meat was so tender and the rice was perfect.", submitter_name: "Ali" },
  { dish_name: "Somsa", price_paid: 12000, rating: 4, title: "Good snack", text: "Very crispy and hot.", submitter_name: "Muborak" },
  { dish_name: "Lagmon", price_paid: 32000, rating: 5, title: "Authentic", text: "Noodles are clearly hand-made.", submitter_name: "Jasur" },
  { dish_name: "T-shirt", price_paid: 150000, rating: 4, title: "Good quality", text: "Fits perfectly and the material is nice.", submitter_name: "Elena" }
];

export async function seedDatabase() {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('listings')
      .select('id')
      .limit(1);
    
    if (fetchError) {
      console.error("Error checking for existing listings:", fetchError);
      return;
    }

    if (!existing || existing.length === 0) {
      console.log("Seeding database with sample listings and reviews...");
      
      for (const item of SAMPLE_LISTINGS) {
        const { data: listing, error: insertError } = await supabase
          .from('listings')
          .insert([item])
          .select()
          .single();
        
        if (insertError) {
          console.error(`Error inserting listing ${item.name}:`, insertError);
          continue;
        }

        if (listing) {
          // Add a review for this listing
          const review = SAMPLE_REVIEWS.find(r => 
            (listing.type === 'food' && ['Osh', 'Somsa', 'Lagmon'].includes(r.dish_name)) ||
            (listing.type === 'clothes' && r.dish_name === 'T-shirt')
          );

          if (review) {
            const { error: reviewError } = await supabase
              .from('reviews')
              .insert([{
                ...review,
                listing_id: listing.id,
                visit_date: new Date().toISOString().split('T')[0],
                tags: []
              }]);
            
            if (reviewError) {
              console.error(`Error inserting review for ${listing.name}:`, reviewError);
            }
          }
        }
      }
      console.log("Database seeded successfully!");
    } else {
      console.log("Database already has data.");
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}
