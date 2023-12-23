import { packets, payments } from './collections.js';

import isAdminById from '../account-info/is-admin-by-id.js';

/**
 * @param {String} packetName
 * @param {String} username
 * @returns {Promise<Boolean>} true if the user has paid for the packet, if the packet is free, or if the user is an admin.
 */
async function checkPayment(packetName, user_id) {
    const packet = await packets.findOne({ name: packetName });

    if (!packet) {
        return false;
    } else if (packet.costInCents === 0) {
        return true;
    }

    if (await isAdminById(user_id)) {
        return true;
    }

    const result = await payments.findOne({ 'packet.name': packetName, user_id });
    return !!result;
}

export default checkPayment;
