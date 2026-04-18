import express from 'express';
import { supabase } from '../utils/supabase.js';

const router = express.Router();


// GET all documents for user
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;
    const { data: documents, error } = await supabase
      .from('documents')
      .select('id, filename, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(documents);
  } catch (err) {
    if (err.cause) console.error('Error fetching documents (Cause):', err.cause.message || err.cause);
    console.error('Error fetching documents:', err.message);
    res.status(500).json({ error: `Failed to fetch documents: ${err.message}${err.cause ? ' (' + (err.cause.message || err.cause) + ')' : ''}` });
  }
});


// DELETE a document
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.userId;
    const docId = req.params.id; // supabase-js handles strings/numbers
    
    const { data: deletedDoc, error } = await supabase
      .from('documents')
      .delete()
      .eq('id', docId)
      .eq('user_id', userId)
      .select();

    if (error) throw error;
    
    if (!deletedDoc || deletedDoc.length === 0) {
      return res.status(404).json({ error: 'Document not found or unauthorized' });
    }
    
    res.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    if (err.cause) console.error('Error deleting document (Cause):', err.cause.message || err.cause);
    console.error('Error deleting document:', err.message);
    res.status(500).json({ error: `Failed to delete document: ${err.message}${err.cause ? ' (' + (err.cause.message || err.cause) + ')' : ''}` });
  }
});


export default router;
