import Setting from '../models/Setting.js';
import { logAudit } from '../middleware/audit.js';

export const getSettings = async (req, res, next) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({
        clinic_name: 'SNAB Dental Clinic',
        tagline: 'Specialized Dental Care & Oral Surgery',
        phone: '+252 61 2339093',
        email: 'info@snabdental.com',
        address: 'Mogadishu Main Road, Isgoyska howalwadaag, Somalia',
        website: 'www.snabdental.com',
        consultation_fee: 20,
        currency: 'USD',
        currency_symbol: '$',
        tooth_numbering_system: 'FDI (Two-digit notation)'
      });
    } else {
      let updated = false;
      if (settings.address && settings.address.includes('KM4')) {
        settings.address = 'Mogadishu Main Road, Isgoyska howalwadaag, Somalia';
        updated = true;
      }
      if (settings.phone && settings.phone.includes('5000000')) {
        settings.phone = '+252 61 2339093';
        updated = true;
      }
      if (updated) {
        await settings.save();
      }
    }
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create(req.body);
    } else {
      settings = await Setting.findByIdAndUpdate(settings._id, req.body, {
        new: true,
        runValidators: true
      });
    }

    await logAudit({
      user: req.user,
      action: 'UPDATE_SETTINGS',
      entity: 'Setting',
      entity_id: settings._id,
      details: { clinic_name: settings.clinic_name, consultation_fee: settings.consultation_fee }
    });

    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};
