import { Calendar, Mail, MapPin, Phone, User } from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "../../lib/hooks/useToast";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface ProfileData {
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
	address: string;
	dateOfBirth: string;
	bio: string;
}

export function ProfileSettings() {
	const { toast } = useToast();
	const [isEditing, setIsEditing] = useState(false);
	const [profileData, setProfileData] = useState<ProfileData>({
		firstName: "John",
		lastName: "Doe",
		email: "john.doe@example.com",
		phone: "+1 (555) 123-4567",
		address: "123 Main St, City, State 12345",
		dateOfBirth: "1990-01-15",
		bio: "Financial enthusiast focused on building wealth and achieving financial independence.",
	});

	const handleSave = (_e: React.FormEvent) => {
		// Here you would typically save to your backend
		console.log("Saving profile data:", profileData);
		setIsEditing(false);
		toast({
			title: "Profile Updated",
			description: "Your profile information has been successfully updated.",
		});
	};

	const handleCancel = () => {
		setIsEditing(false);
		// Reset to original data if needed
	};

	const handleInputChange = (field: keyof ProfileData, value: string) => {
		setProfileData((prev) => ({ ...prev, [field]: value }));
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-mono font-bold tracking-wider uppercase">
						Profile Settings
					</h2>
					<p className="text-muted-foreground font-mono text-sm uppercase tracking-wider">
						Manage your personal information and preferences
					</p>
				</div>
				{!isEditing && (
					<Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
				)}
			</div>

			<Card className="bg-card/60 backdrop-blur-sm">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-lg font-mono font-bold tracking-wider uppercase">
						<User className="h-5 w-5" />
						Personal Information
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-2">
							<Label htmlFor="firstName">First Name</Label>
							<Input
								id="firstName"
								value={profileData.firstName}
								onChange={(e) => handleInputChange("firstName", e.target.value)}
								disabled={!isEditing}
								className={!isEditing ? "bg-muted" : ""}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="lastName">Last Name</Label>
							<Input
								id="lastName"
								value={profileData.lastName}
								onChange={(e) => handleInputChange("lastName", e.target.value)}
								disabled={!isEditing}
								className={!isEditing ? "bg-muted" : ""}
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="email" className="flex items-center gap-2">
							<Mail className="h-4 w-4" />
							Email Address
						</Label>
						<Input
							id="email"
							type="email"
							value={profileData.email}
							onChange={(e) => handleInputChange("email", e.target.value)}
							disabled={!isEditing}
							className={!isEditing ? "bg-muted" : ""}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="phone" className="flex items-center gap-2">
							<Phone className="h-4 w-4" />
							Phone Number
						</Label>
						<Input
							id="phone"
							type="tel"
							value={profileData.phone}
							onChange={(e) => handleInputChange("phone", e.target.value)}
							disabled={!isEditing}
							className={!isEditing ? "bg-muted" : ""}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="address" className="flex items-center gap-2">
							<MapPin className="h-4 w-4" />
							Address
						</Label>
						<Input
							id="address"
							value={profileData.address}
							onChange={(e) => handleInputChange("address", e.target.value)}
							disabled={!isEditing}
							className={!isEditing ? "bg-muted" : ""}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="dateOfBirth" className="flex items-center gap-2">
							<Calendar className="h-4 w-4" />
							Date of Birth
						</Label>
						<Input
							id="dateOfBirth"
							type="date"
							value={profileData.dateOfBirth}
							onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
							disabled={!isEditing}
							className={!isEditing ? "bg-muted" : ""}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="bio">Bio</Label>
						<Textarea
							id="bio"
							value={profileData.bio}
							onChange={(e) => handleInputChange("bio", e.target.value)}
							disabled={!isEditing}
							className={!isEditing ? "bg-muted" : ""}
							rows={3}
							placeholder="Tell us a bit about yourself..."
						/>
					</div>

					{isEditing && (
						<div className="flex gap-3 pt-4">
							<Button onClick={handleSave}>Save Changes</Button>
							<Button variant="outline" onClick={handleCancel}>
								Cancel
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
