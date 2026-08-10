export interface LivelihoodRegistrationPayload {
    fullName: string;
    email: string;
    phone: string;
    organization: string;
}

export const registerForLivelihoodChallenge = async (payload: LivelihoodRegistrationPayload) => {
    const response = await fetch('/api/events/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
        if (response.status === 409) {
            throw new Error(data.message || 'You are already registered for this event.');
        }
        if (response.status === 400) {
            throw new Error(data.message || 'Please check your registration details.');
        }
        throw new Error(data.message || 'Failed to register. Please try again.');
    }

    return data;
};
