import { useState, useEffect } from 'react';
import { updateUserSettings } from '../api/decks';

/**
 * SRS Settings View Component
 * Allows users to configure their spaced repetition settings
 */
const SRSSettingsView = ({ currentUser, userSettings, onSettingsUpdated, onBack }) => {
  const [settings, setSettings] = useState({
    max_interval: 36500,
    starting_ease_factor: 2.5,
    easy_bonus: 1.3,
    interval_modifier: 1.0,
    hard_interval_factor: 1.0,
    new_cards_per_day: 20,
    learning_steps: '1m,6m,10m,12d'
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (userSettings) {
      setSettings(userSettings);
    }
  }, [userSettings]);

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!currentUser) return;
    
    setSaving(true);
    setSaveMessage('');
    
    try {
      const userId = currentUser.id || currentUser.uid || currentUser.email;
      const result = await updateUserSettings(userId, settings);
      setSaveMessage('Settings saved successfully! ✅');
      onSettingsUpdated(result.settings);
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          title="Back to options"
        >
          <span className="material-icons text-2xl">arrow_back</span>
        </button>
        <h2 className="text-xl font-semibold dark:text-white">SRS Settings</h2>
      </div>

      <div className="bg-white dark:bg-gray-800/95 dark:backdrop-blur-sm rounded-lg shadow-lg p-8 border border-gray-200 dark:border-gray-700">
        <div className="space-y-6">
          {/* Max Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Maximum Interval (days)
            </label>
            <input
              type="number"
              min="1"
              max="100000"
              value={settings.max_interval}
              onChange={(e) => handleChange('max_interval', parseInt(e.target.value) || 36500)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Maximum days between reviews (1-100000)</p>
          </div>

          {/* Starting Ease Factor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Starting Ease Factor
            </label>
            <input
              type="number"
              step="0.1"
              min="1.1"
              max="3.0"
              value={settings.starting_ease_factor}
              onChange={(e) => handleChange('starting_ease_factor', parseFloat(e.target.value) || 2.5)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Initial ease factor for new cards (1.1-3.0)</p>
          </div>

          {/* Easy Bonus */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Easy Bonus
            </label>
            <input
              type="number"
              step="0.1"
              min="1.0"
              max="2.0"
              value={settings.easy_bonus}
              onChange={(e) => handleChange('easy_bonus', parseFloat(e.target.value) || 1.3)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Multiplier for "Easy" button (1.0-2.0)</p>
          </div>

          {/* Interval Modifier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Interval Modifier
            </label>
            <input
              type="number"
              step="0.1"
              min="0.5"
              max="2.0"
              value={settings.interval_modifier}
              onChange={(e) => handleChange('interval_modifier', parseFloat(e.target.value) || 1.0)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Global interval multiplier (0.5-2.0)</p>
          </div>

          {/* Hard Interval Factor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Hard Interval Factor
            </label>
            <input
              type="number"
              step="0.1"
              min="1.0"
              max="2.0"
              value={settings.hard_interval_factor}
              onChange={(e) => handleChange('hard_interval_factor', parseFloat(e.target.value) || 1.0)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Multiplier for "Hard" button on review cards (1.0-2.0)</p>
          </div>

          {/* New Cards Per Day */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Cards Per Day
            </label>
            <input
              type="number"
              min="1"
              max="200"
              value={settings.new_cards_per_day}
              onChange={(e) => handleChange('new_cards_per_day', parseInt(e.target.value) || 20)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Daily limit for new cards (1-200)</p>
          </div>

          {/* Learning Steps */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Learning Steps Queue
            </label>
            <input
              type="text"
              value={settings.learning_steps}
              onChange={(e) => handleChange('learning_steps', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="1m,6m,10m,12d"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Comma-separated steps (e.g., "1m,6m,10m,12d"). Use m=minutes, h=hours, d=days</p>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {saveMessage && (
                <span className={saveMessage.includes('Error') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                  {saveMessage}
                </span>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SRSSettingsView;

