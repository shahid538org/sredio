const mongoose = require('mongoose');

// Get available collections
exports.getCollections = async (req, res) => {
  try {
    // Get all collections from the database
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    // Define expected collections
    const expectedCollections = [
      'githubintegrations',
      'githuborganizations',
      'githubrepositories',
      'githubcommits',
      'githubpullrequests',
      'githubissues',
      'githubissuechangelogs',
      'githuborganizationmembers'
    ];

    // Log collection status
    console.log('Available collections:', collectionNames);
    console.log('Expected collections:', expectedCollections);

    // Return both available and expected collections
    res.json({
      available: collectionNames,
      expected: expectedCollections,
      missing: expectedCollections.filter(c => !collectionNames.includes(c))
    });
  } catch (error) {
    console.error('Error getting collections:', error);
    res.status(500).json({ message: 'Error getting collections' });
  }
};

// Get schema for a collection
exports.getCollectionSchema = async (req, res) => {
  try {
    const { collection } = req.params;
    
    // Check if model exists
    if (!mongoose.models[collection]) {
      return res.status(404).json({ message: `Collection ${collection} not found` });
    }

    const model = mongoose.model(collection);
    const schema = model.schema.obj;
    
    // Format schema for frontend
    const formattedSchema = Object.entries(schema).reduce((acc, [key, value]) => {
      acc[key] = {
        type: value.type?.name || typeof value,
        required: value.required || false,
        unique: value.unique || false
      };
      return acc;
    }, {});

    res.json(formattedSchema);
  } catch (error) {
    console.error('Error getting schema:', error);
    res.status(500).json({ message: 'Error getting schema' });
  }
};

// Get data from a collection with pagination and search
exports.getData = async (req, res) => {
  try {
    const { collection } = req.params;
    
    // Check if model exists
    if (!mongoose.models[collection]) {
      return res.status(404).json({ message: `Collection ${collection} not found` });
    }

    const { page = 1, limit = 10, search } = req.query;
    const skip = (page - 1) * limit;

    const model = mongoose.model(collection);
    let query = {};

    // Add search functionality if search term is provided
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { login: { $regex: search, $options: 'i' } },
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const [data, total] = await Promise.all([
      model.find(query)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      model.countDocuments(query)
    ]);

    res.json({
      data,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting data:', error);
    res.status(500).json({ message: 'Error getting data' });
  }
}; 