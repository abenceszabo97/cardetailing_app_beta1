/**
 * Notification Service - Push notifications with sound
 */

// Notification sound (base64 encoded short beep)
const NOTIFICATION_SOUND_URL = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkI2Coverage/v7+/f39/Pz8+/v7+vr6+fn5+Pj49/f39vb29fX19PT08/Pz8vLy8fHx8PDw7+/v7u7u7e3t7Ozs6+vr6urq6enp6Ojo5+fn5ubm5eXl5OTk4+Pj4uLi4eHh4ODg39/f3t7e3d3d3Nzc29vb2tra2dnZ2NjY19fX1tbW1dXV1NTU09PT0tLS0dHR0NDQz8/Pzs7Ozc3NzMzMy8vLysrKycnJyMjIx8fHxsbGxcXFxMTEw8PDwsLCwcHBwMDAv7+/vr6+vb29vLy8u7u7urq6ubm5uLi4t7e3tra2tbW1tLS0s7OzsrKysbGxsLCwr6+vrq6ura2trKysq6urqqqqampqaWlpampqa2tramtsbG1ubm9wcHFxcnJzc3R0dXV2dnd3eHh5eXp6e3t8fH19fn5/f4CAgYGCgoODhISFhYaGh4eIiImJioqLi4yMjY2Ojo+PkJCRkZKSk5OUlJWVlpaXl5iYmZmampubm5ycnZ2enp+foKChoaKio6OkpKWlpqanp6ioqamqqqqrrKytra6ur6+wsLGxsrKzs7S0tbW2tre3uLi5ubq6u7u8vL29vr6/v8DAwcHCwsPDxMTFxcbGx8fIyMnJysrLy8zMzc3Ozs/P0NDR0dLS09PU1NXV1tbX19jY2dna2tvb3Nzd3d7e39/g4OHh4uLj4+Tk5eXm5ufn6Ojp6err6+zs7e3u7u/v8PDx8fLy8/P09PX19vb39/j4+fn6+vv7/Pz9/f7+';

let audioContext = null;
let notificationSound = null;

// Initialize audio
const initAudio = async () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  
  if (!notificationSound) {
    try {
      const response = await fetch(NOTIFICATION_SOUND_URL);
      const arrayBuffer = await response.arrayBuffer();
      notificationSound = await audioContext.decodeAudioData(arrayBuffer);
    } catch (e) {
      console.log('Using fallback sound');
    }
  }
};

// Play notification sound
const playSound = async () => {
  try {
    await initAudio();
    
    if (notificationSound && audioContext) {
      const source = audioContext.createBufferSource();
      source.buffer = notificationSound;
      source.connect(audioContext.destination);
      source.start(0);
    } else {
      // Fallback: create a simple beep
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    }
  } catch (e) {
    console.log('Sound playback failed:', e);
  }
};

// Request notification permission
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};

// Check if notifications are enabled
export const isNotificationEnabled = () => {
  return 'Notification' in window && Notification.permission === 'granted';
};

// Show notification
export const showNotification = async (title, options = {}) => {
  // Play sound first
  await playSound();
  
  // Show browser notification if permitted
  if (isNotificationEnabled()) {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      silent: true, // We play our own sound
      ...options
    });
    
    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);
    
    // Focus window on click
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    
    return notification;
  }
  
  return null;
};

// Notification types
export const notifyJobStatusChange = (jobInfo, newStatus) => {
  const statusLabels = {
    'folyamatban': 'Folyamatban',
    'kesz': 'Kész',
    'nem_jott_el': 'Nem jelent meg',
    'lemondta': 'Lemondva'
  };
  
  const statusEmoji = {
    'folyamatban': '🔄',
    'kesz': '✅',
    'nem_jott_el': '❌',
    'lemondta': '🚫'
  };
  
  return showNotification(
    `${statusEmoji[newStatus] || '📋'} Munka státusz változás`,
    {
      body: `${jobInfo.plate_number} - ${jobInfo.customer_name}\n${statusLabels[newStatus] || newStatus}`,
      tag: `job-status-${jobInfo.job_id}`
    }
  );
};

export const notifyPayment = (jobInfo, paymentMethod) => {
  const methodLabel =
    paymentMethod === 'keszpenz'
      ? '💵 Készpénz'
      : (paymentMethod === 'atutalas' || paymentMethod === 'utalas' || paymentMethod === 'banki_atutalas')
        ? '🏦 Átutalás'
        : '💳 Kártya';
  
  return showNotification(
    '💰 Fizetés rögzítve',
    {
      body: `${jobInfo.plate_number} - ${jobInfo.price?.toLocaleString()} Ft\n${methodLabel}`,
      tag: `payment-${jobInfo.job_id}`
    }
  );
};

export const notifyImageUpload = (jobInfo, slotName) => {
  return showNotification(
    '📷 Kép feltöltve',
    {
      body: `${jobInfo.plate_number}\n${slotName}`,
      tag: `image-${jobInfo.job_id}-${Date.now()}`
    }
  );
};

export const notifyNewBooking = (bookingInfo) => {
  return showNotification(
    '📅 Új foglalás érkezett!',
    {
      body: `${bookingInfo.customer_name}\n${bookingInfo.plate_number}\n${bookingInfo.date} ${bookingInfo.time_slot}`,
      tag: `booking-${bookingInfo.booking_id}`
    }
  );
};

export const notifyJobEdit = (jobInfo) => {
  return showNotification(
    '✏️ Munka módosítva',
    {
      body: `${jobInfo.plate_number} - ${jobInfo.customer_name}`,
      tag: `job-edit-${jobInfo.job_id}`
    }
  );
};

export default {
  requestNotificationPermission,
  isNotificationEnabled,
  showNotification,
  notifyJobStatusChange,
  notifyPayment,
  notifyImageUpload,
  notifyNewBooking,
  notifyJobEdit
};
